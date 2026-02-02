import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { userAdminService } from '../services/userAdminService';
import toast from 'react-hot-toast';
import { Shield, User, Crown } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { getToken } = useAuth();
    const { user: currentUser } = useUser();

    const fetchUsers = async () => {
        try {
            const token = await getToken();
            const data = await userAdminService.getAllUsers(token);
            if (data.success) {
                setUsers(data.users);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePromote = async (userId, email) => {
        if (!confirm(`Are you sure you want to promote ${email} to admin?`)) return;

        try {
            const token = await getToken();
            const data = await userAdminService.promoteToAdmin(userId, token);
            if (data.success) {
                toast.success(data.message);
                await fetchUsers();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleDemote = async (userId, email) => {
        if (!confirm(`Are you sure you want to demote ${email} to regular user?`)) return;

        try {
            const token = await getToken();
            const data = await userAdminService.demoteToUser(userId, token);
            if (data.success) {
                toast.success(data.message);
                await fetchUsers();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchUsers();
        }
    }, [currentUser]);

    if (loading) {
        return (
            <div className='flex justify-center items-center h-full'>
                <span className='w-10 h-10 my-1 rounded-full border-3 border-primary border-t-transparent animate-spin'></span>
            </div>
        );
    }

    return (
        <div className='flex-1 h-full flex flex-col gap-4 p-6'>
            <div className='flex items-center justify-between'>
                <h1 className='text-2xl font-semibold text-gray-800'>
                    User Management
                </h1>
                <div className='flex gap-4'>
                    <div className='flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg'>
                        <User className='w-4 h-4 text-blue-600' />
                        <span className='text-sm font-medium text-blue-600'>
                            {users.filter(u => u.role === 'user').length} Users
                        </span>
                    </div>
                    <div className='flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg'>
                        <Crown className='w-4 h-4 text-purple-600' />
                        <span className='text-sm font-medium text-purple-600'>
                            {users.filter(u => u.role === 'admin').length} Admins
                        </span>
                    </div>
                </div>
            </div>

            <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
                <div className='overflow-x-auto'>
                    <table className='w-full'>
                        <thead className='bg-gray-50 border-b border-gray-200'>
                            <tr>
                                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                                    User
                                </th>
                                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                                    Email
                                </th>
                                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                                    Role
                                </th>
                                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                                    Joined
                                </th>
                                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-200'>
                            {users.map((user) => (
                                <tr
                                    key={user.id}
                                    className='hover:bg-gray-50 transition-colors'
                                >
                                    <td className='px-4 py-3'>
                                        <div className='flex items-center gap-3'>
                                            <img
                                                src={user.imageUrl}
                                                alt={user.fullName}
                                                className='w-10 h-10 rounded-full'
                                            />
                                            <div>
                                                <p className='text-sm font-medium text-gray-900'>
                                                    {user.fullName}
                                                </p>
                                                {user.id === currentUser.id && (
                                                    <span className='text-xs text-blue-600'>
                                                        (You)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className='px-4 py-3 text-sm text-gray-600'>
                                        {user.email}
                                    </td>
                                    <td className='px-4 py-3'>
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                                                user.role === 'admin'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            {user.role === 'admin' ? (
                                                <Crown className='w-3 h-3' />
                                            ) : (
                                                <User className='w-3 h-3' />
                                            )}
                                            {user.role === 'admin' ? 'Admin' : 'User'}
                                        </span>
                                    </td>
                                    <td className='px-4 py-3 text-sm text-gray-500'>
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className='px-4 py-3'>
                                        {user.id !== currentUser.id && (
                                            <>
                                                {user.role === 'user' ? (
                                                    <button
                                                        onClick={() => handlePromote(user.id, user.email)}
                                                        className='inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors'
                                                    >
                                                        <Shield className='w-3.5 h-3.5' />
                                                        Promote to Admin
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDemote(user.id, user.email)}
                                                        className='inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors'
                                                    >
                                                        <User className='w-3.5 h-3.5' />
                                                        Demote to User
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
