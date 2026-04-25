import { useSelector } from 'react-redux';
import { Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';

import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, StyledEngineProvider } from '@mui/material';
import 'index.css';

// routing
import router from 'routes';

// defaultTheme
import themes from 'themes';

// project imports
import NavigationScroll from 'layout/NavigationScroll';
import { QueryClient, QueryClientProvider } from 'react-query';
import AuthProvider from 'providers/AuthProvider';

// ==============================|| APP ||============================== //

const queryClient = new QueryClient();

const App = () => {
    const customization = useSelector((state) => state.customization);

    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={themes(customization)}>
                <CssBaseline />
                <QueryClientProvider client={queryClient}>
                    <AuthProvider>
                        <NavigationScroll>
                            <RouterProvider router={router} />
                        </NavigationScroll>
                    </AuthProvider>
                </QueryClientProvider>
            </ThemeProvider>
        </StyledEngineProvider>
    );
};

export default App;
