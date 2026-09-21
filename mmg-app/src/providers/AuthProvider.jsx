import auth from 'api/auth';
import { toUpper } from 'lodash';
import Role from 'utils/Role';
import { clearTerminal, getTerminal, missingTerminalFields, saveTerminal } from 'utils/terminalSession';
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

    const getUser = async () => {
        setLoading(true);

        try {
            const user = await auth.GetAuthUser();
            if (user.branches && user.branches.length === 1) {
                setBranch(user.branches[0]);
                localStorage.setItem('branch', JSON.stringify(user.branches[0]));
            }

            setUser(user);
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

        const authUser = await getUser();

        if (toUpper(authUser?.role?.name) === Role.CASHIER) {
            let info;
            try {
                info = await getTerminalInfo?.();
            } catch (e) {
                info = { error: e?.message };
            }

            const missing = info?.error || !info ? ['MIN', 'SN', 'PTU No'] : missingTerminalFields(info);
            if (missing.length > 0) {
                await logoutUser();
                throw {
                    message: info?.error
                        ? `Cannot log in: unable to read this terminal's configuration from the helper app (${info.error}).`
                        : `Cannot log in: this terminal is not configured (missing ${missing.join(', ')}). Set them in the helper app Settings first.`
                };
            }

            saveTerminal(info);
            setTerminal({ MIN: info.MIN, SN: info.SN, PTU_NO: info.PTU_NO });
        }

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
