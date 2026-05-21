import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button, FormField, Input } from '@/components/common';
import { useLogin } from '../hooks/useLogin';
import styles from './LoginPage.module.css';

const DEMO_ACCOUNTS = [
  { role: 'Administrateur', email: 'admin@pnud.org' },
  { role: 'Superviseur', email: 'superviseur@sahel.com' },
  { role: 'Observateur', email: 'observateur@pnud.org' },
];

export function LoginPage() {
  const [email, setEmail] = useState('admin@pnud.org');
  const [password, setPassword] = useState('demo');
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <main className={styles.page}>
      <section className={styles.visual} aria-hidden="true">
        <div className={styles.visualOverlay}>
          <div className={styles.brand}>
            <span className={styles.brandWordmarkTop}>PASET</span>
            <span className={styles.brandWordmarkBottom}>MALI</span>
          </div>
          <p className={styles.eyebrow}>PNUD Mali · UNDP-MLI-00492</p>
          <h2 className={styles.visualTitle}>
            Suivi socio-environnemental des sites de teinture artisanale.
          </h2>
          <ul className={styles.metaList}>
            <li><span>5</span> sites pilotes</li>
            <li><span>~600</span> teinturiers·ères</li>
            <li><span>49</span> indicateurs</li>
            <li><span>3 ans</span> de suivi</li>
          </ul>

          <div className={styles.visualSignature}>
            <span className={styles.visualSignatureLabel}>Programme appuyé par</span>
            <img
              src="/logos/PNUD-Logo-White-Large.png"
              alt="PNUD"
              className={styles.visualLogo}
            />
          </div>
        </div>
      </section>

      <section className={styles.formPane}>
        <div className={styles.formCard}>
          <header className={styles.cardHead}>
            <h1 className={styles.title}>Connexion</h1>
            <p className={styles.subtitle}>Accédez à votre espace de suivi.</p>
          </header>

          <form onSubmit={onSubmit} className={styles.form} noValidate>
            <FormField label="Adresse e-mail">
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                prefix={<Mail size={14} />}
                inputSize="md"
                required
              />
            </FormField>

            <FormField label="Mot de passe">
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                prefix={<Lock size={14} />}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={styles.eyeBtn}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
                inputSize="md"
                required
              />
            </FormField>

            <div className={styles.formMeta}>
              <a href="#forgot" className={styles.forgotLink}>
                Mot de passe oublié ?
              </a>
            </div>

            {login.isError ? (
              <p className={styles.error} role="alert">
                {login.error instanceof Error ? login.error.message : 'Erreur d\'authentification.'}
              </p>
            ) : null}

            <Button
              type="submit"
              size="md"
              fullWidth
              loading={login.isPending}
              iconRight={<ArrowRight size={14} />}
            >
              Se connecter
            </Button>
          </form>

          <div className={styles.demoSection}>
            <p className={styles.demoTitle}>Comptes de démonstration</p>
            <ul className={styles.demoList}>
              {DEMO_ACCOUNTS.map((acc) => (
                <li key={acc.email}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword('demo');
                    }}
                    className={styles.demoChip}
                    title={acc.email}
                  >
                    {acc.role}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className={styles.footer}>
          <p>© 2026 · <strong>PASET Mali</strong> — PNUD Mali · Consortium Sahel Analytics</p>
        </footer>
      </section>
    </main>
  );
}
