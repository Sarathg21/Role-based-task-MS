import React from 'react';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AccessDeniedPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="text-red-600" size={40} />
                </div>

                <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Denied</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    Oops! It looks like you don't have the necessary permissions to view this page.
                    Please contact your administrator if you believe this is an error.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-shadow hover:shadow-lg shadow-violet-200 transition-colors"
                    >
                        <Home size={18} />
                        Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccessDeniedPage;
