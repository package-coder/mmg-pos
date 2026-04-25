import auth from 'api/auth';
import { toUpper } from 'lodash';
import { useContext, createContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [branch, setBranch] = useState(
        localStorage.getItem('selectedBranch') ? JSON.parse(localStorage.getItem('selectedBranch')) : null
    );
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
        } catch (e) {
            setUser(null);
            localStorage.removeItem('branch');
        } finally {
            setLoading(false);
        }
    };

    const loginUser = async (data) => {
        const { data: user, ...others } = await auth.LoginUser(data);

        if (others.code === 11) throw { message: 'Invalid username or password' };

        await getUser();
        return user;
    };

    const logoutUser = async () => {
        await auth.LogoutUser();
        setBranch(null);
        setUser(null);
        localStorage.removeItem('branch');
    };

    return (
        <AuthContext.Provider value={{ loading, setBranch, matchRole, branch, user, loginUser, logoutUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;

export const useAuth = () => {
    return useContext(AuthContext);
};
