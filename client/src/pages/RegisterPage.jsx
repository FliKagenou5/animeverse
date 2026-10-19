import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field, Input } from '../components/ui/Form.jsx';
import { getApiError, getFieldErrors } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
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
    if (form.name.trim().length < 2) next.name = 'Name must be at least 2 characters.';
    if (!form.email.trim()) next.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = 'Include at least one letter and one number.';
    }
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    setGeneralError('');
    try {
      const user = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      toast.success(`Your index is ready, ${user.name.split(' ')[0]}.`, 'Account created');
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
      eyebrow="New explorer"
      title="Join the index."
      description="Create an account to build favorites, save tier lists and keep battle analyses."
      footer={
        <p>
          Already have an account?{' '}
          <Link to="/login" state={{ from }} className="text-link">
            Sign in
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

        <Field label="Display name" htmlFor="register-name" error={errors.name} required>
          <div className="input-icon-group">
            <User size={16} aria-hidden="true" />
            <Input
              id="register-name"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder="Explorer name"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
            />
          </div>
        </Field>

        <Field label="Email address" htmlFor="register-email" error={errors.email} required>
          <div className="input-icon-group">
            <Mail size={16} aria-hidden="true" />
            <Input
              id="register-email"
              type="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
          </div>
        </Field>

        <div className="auth-form-grid">
          <Field
            label="Password"
            htmlFor="register-password"
            error={errors.password}
            hint="8+ characters with a letter and number."
            required
          >
            <div className="input-icon-group">
              <Lock size={16} aria-hidden="true" />
              <Input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => update('password', event.target.value)}
                placeholder="Create password"
                autoComplete="new-password"
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

          <Field
            label="Confirm password"
            htmlFor="register-confirm"
            error={errors.confirm}
            required
          >
            <div className="input-icon-group">
              <Lock size={16} aria-hidden="true" />
              <Input
                id="register-confirm"
                type={showPassword ? 'text' : 'password'}
                value={form.confirm}
                onChange={(event) => update('confirm', event.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirm)}
              />
            </div>
          </Field>
        </div>

        <Button
          type="submit"
          block
          size="lg"
          loading={submitting}
          iconRight={ArrowRight}
          className="auth-submit"
        >
          Create account
        </Button>

        <p className="auth-fine-print">
          Passwords are hashed on the server and sessions use an httpOnly cookie. Your account is
          stored in the local SQLite database.
        </p>
      </form>
    </AuthLayout>
  );
}
