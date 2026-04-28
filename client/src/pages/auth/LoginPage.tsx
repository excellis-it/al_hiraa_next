import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useLoginMutation } from '../../store/api/authApi';
import { setCredentials } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

const DEMO_USERS = [
  { label: 'Admin', email: 'admin@alhiraa.com', password: 'Admin@123', color: 'bg-rose-100 text-rose-700' },
  { label: 'Data Entry', email: 'dataentry@alhiraa.com', password: 'Password@123', color: 'bg-violet-100 text-violet-700' },
  { label: 'Recruiter', email: 'recruiter@alhiraa.com', password: 'Password@123', color: 'bg-blue-100 text-blue-700' },
  { label: 'Manager', email: 'manager@alhiraa.com', password: 'Password@123', color: 'bg-emerald-100 text-emerald-700' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login({ email, password }).unwrap();
      dispatch(setCredentials(result));
      toast.success(`Welcome back, ${result.user.full_name.split(' ')[0]}!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Invalid credentials');
    }
  };

  const fillDemo = (u: typeof DEMO_USERS[0]) => {
    setEmail(u.email);
    setPassword(u.password);
  };

  return (
    <div className="min-h-screen bg-[#EEF2F7] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 right-0 w-48 h-48 bg-white/5 rounded-full" />

        <div className="relative">
          <div className="mb-6">
            <img src="/logo.png" alt="Al-Hiraa" className="h-14 w-auto object-contain brightness-0 invert" />
          </div>
          <h1 className="text-white text-3xl font-bold leading-tight">
            Al-Hiraa Manpower
          </h1>
          <p className="text-blue-200 mt-2 text-base">Application Tracking & Management System</p>
        </div>

        <div className="relative space-y-5">
          {[
            { icon: '👥', title: '10,000+ Workers Deployed', sub: 'To Gulf countries annually' },
            { icon: '⚡', title: '30-Day Target Deployment', sub: 'Reduced from 45-60 days' },
            { icon: '📊', title: 'Real-Time Pipeline Visibility', sub: 'Across all associates & consultants' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                {item.icon}
              </div>
              <div>
                <div className="text-white font-semibold text-sm">{item.title}</div>
                <div className="text-blue-200 text-xs mt-0.5">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="relative text-blue-300 text-xs">© 2026 Al-Hiraa Manpower Consultant Pvt. Ltd., Kolkata</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src="/logo.png" alt="Al-Hiraa" className="h-9 w-auto object-contain" />
            <span className="font-bold text-gray-800">Al-Hiraa ATMS</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-sm text-gray-400 mb-7">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="you@alhiraa.com"
                  required
                />
              </div>

              <div>
                <label className="form-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input pr-10"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors mt-2"
              >
                <LogIn size={16} />
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Demo credentials */}
          <div className="mt-5">
            <p className="text-xs text-gray-400 text-center mb-3 uppercase tracking-wider font-semibold">Quick access — Demo accounts</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  onClick={() => fillDemo(u)}
                  className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-left hover:border-blue-200 hover:shadow-sm transition-all group"
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${u.color}`}>{u.label}</span>
                  <p className="text-xs text-gray-400 mt-1 truncate group-hover:text-gray-600">{u.email}</p>
                  <p className="text-[10px] text-gray-300 mt-0.5 font-mono">{u.password}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
