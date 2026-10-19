import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field, Input } from '../components/ui/Form.jsx';
import { getApiError, getFieldErrors } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const DEMO = { email: 'admin@animeverse.dev', password: 'Admin#1234' };

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const from = location.state?.from || '/';

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setGeneralError('');
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email.';
    if (!form.password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    setGeneralError('');
    try {
      const user = await login({ email: form.email.trim(), password: form.password });
      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`, 'Signed in');
      navigate(from, { replace: true });
    } catch (error) {
      const apiError = getApiError(error);
      setErrors(getFieldErrors(error));
      setGeneralError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Member access"
      title="Welcome back."
      description="Sign in to keep favorites, save tier lists and archive battle analyses."
      footer={
        <p>
          New to the universe?{' '}
          <Link to="/register" state={{ from }} className="text-link">
            Create an account
          </Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {generalError ? (
          <div className="form-alert" role="alert">
            {generalError}
          </div>
        ) : null}

        <Field label="Email address" htmlFor="login-email" error={errors.email} required>
          <div className="input-icon-group">
            <Mail size={16} aria-hidden="true" />
            <Input
              id="login-email"
              type="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
          </div>
        </Field>

        <Field label="Password" htmlFor="login-password" error={errors.password} required>
          <div className="input-icon-group">
            <Lock size={16} aria-hidden="true" />
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
            />
            <button
              type="button"
              className="input-icon-button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        <Button
          type="submit"
          block
          size="lg"
          loading={submitting}
          iconRight={ArrowRight}
          className="auth-submit"
        >
          Sign in
        </Button>

        {import.meta.env.DEV ? (
          <div className="demo-credentials">
            <div className="demo-credentials-head">
              <Sparkles size={14} aria-hidden="true" />
              <span>Local demo admin</span>
            </div>
            <code>admin@animeverse.dev</code>
            <code>Admin#1234</code>
            <button
              type="button"
              onClick={() => {
                setForm(DEMO);
                setErrors({});
                setGeneralError('');
              }}
            >
              Use demo credentials
            </button>
          </div>
        ) : null}
      </form>
    </AuthLayout>
  );
}
