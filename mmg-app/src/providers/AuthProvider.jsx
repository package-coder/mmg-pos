import auth from 'api/auth';
import { toUpper } from 'lodash';
import Role from 'utils/Role';
import { isDevTestModeEnabled, refreshDevTestMode } from 'utils/devTestMode';
import { clearTerminal, getDevTerminal, getTerminal, missingTerminalFields, saveTerminal } from 'utils/terminalSession';
import { useContext, createContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [branch, setBranch] = useState(
        localStorage.getItem('selectedBranch') ? JSON.parse(localStorage.getItem('selectedBranch')) : null
    );
    const [terminal, setTerminal] = useState(getTerminal());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUser();
    }, []);

    const matchRole = (role) => toUpper(user?.role?.name) === toUpper(role);

    const applyUser = (user) => {
        if (user.branches && user.branches.length === 1) {
            setBranch(user.branches[0]);
            localStorage.setItem('branch', JSON.stringify(user.branches[0]));
        }

        setUser(user);
    };

    const getUser = async () => {
        setLoading(true);

        try {
            const user = await auth.GetAuthUser();
            applyUser(user);
            return user;
        } catch (e) {
            setUser(null);
            localStorage.removeItem('branch');
        } finally {
            setLoading(false);
        }
    };

    // `getTerminalInfo` reads MIN/SN/PTU from this workstation's helper app (config.json). A
    // cashier can only log in once all three are configured; admin/manager are not tied to a
    // terminal and skip the check. The PTU is kept in auth until logout and scopes the X-report,
    // Z-report and transaction list to this terminal.
    const loginUser = async (data, getTerminalInfo) => {
        const { data: user, ...others } = await auth.LoginUser(data);

        if (others.code === 11) throw { message: 'Invalid username or password' };

        // The user is only put into auth state once the terminal check has passed. Setting it first
        // would flash the app open (and unmount the login form, losing its error) for a cashier
        // whose terminal isn't configured.
        const authUser = await auth.GetAuthUser();
        if (!authUser) throw { message: 'Unable to load your account. Please try again.' };

        if (toUpper(authUser?.role?.name) === Role.CASHIER) {
            let info;
            let devTest = false;
            try {
                await refreshDevTestMode();
                devTest = isDevTestModeEnabled();
                // Dev Test Mode has no helper config: it always uses this browser's generated
                // terminal and is never blocked by the terminal check below.
                info = devTest ? getDevTerminal() : await getTerminalInfo?.();
            } catch (e) {
                info = { error: e?.message };
            }

            const missing = devTest ? [] : info?.error || !info ? ['MIN', 'SN', 'PTU No'] : missingTerminalFields(info);
            if (missing.length > 0) {
                await auth.LogoutUser(); // drop the token just issued; nothing else was set yet
                clearTerminal();
                throw {
                    message: info?.error
                        ? `Cannot log in: this terminal's configuration could not be read from the helper app (${info.error}). Make sure the MMG helper is running on this computer, then try again.`
                        : `Cannot log in: this terminal is not configured — missing ${missing.join(', ')}. Ask your administrator to set the MIN, SN and PTU No. in the MMG helper Settings on this computer.`
                };
            }

            saveTerminal(info);
            setTerminal({ MIN: info.MIN, SN: info.SN, PTU_NO: info.PTU_NO });
        }

        applyUser(authUser);
        return user;
    };

    const logoutUser = async () => {
        await auth.LogoutUser();
        clearTerminal();
        setTerminal(null);
        setBranch(null);
        setUser(null);
        localStorage.removeItem('branch');
    };

    return (
        <AuthContext.Provider value={{ loading, setBranch, matchRole, branch, user, terminal, ptuNumber: terminal?.PTU_NO, loginUser, logoutUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;

export const useAuth = () => {
    return useContext(AuthContext);
};
