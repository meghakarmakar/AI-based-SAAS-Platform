import { useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
    const { user, isLoaded } = useUser();

    if (!isLoaded) {
        return (
            <div className='flex justify-center items-center h-full'>
                <span className='w-10 h-10 my-1 rounded-full border-3 border-primary border-t-transparent animate-spin'></span>
            </div>
        );
    }

    const isAdmin = user?.publicMetadata?.role === 'admin';

    if (!isAdmin) {
        return <Navigate to='/ai' replace />;
    }

    return children;
};

export default AdminRoute;
