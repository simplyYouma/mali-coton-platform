import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button, FormField, Input } from '@/components/common';
import { http } from '@/lib/http';
import { useLogin } from '../hooks/useLogin';
import styles from './LoginPage.module.css';

interface StatistiquesPubliques {
  sitesSuivis: number;
  composantes: number;
  composantesCodes: string[];
  seuilsNormatifs: number;
  resultatsAnalyses: number;
}

function useStatistiquesPubliques() {
  return useQuery<StatistiquesPubliques>({
    queryKey: ['statistiques-publiques'],
    queryFn: () => http<StatistiquesPubliques>('/statistiques-publiques', { public: true }),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const { data: stats } = useStatistiquesPubliques();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <main className={styles.page}>
      <section className={styles.visual} aria-hidden="true">
        <div className={styles.visualOverlay}>
          <div className={styles.brand}>
            <span className={styles.brandWordmark}>
              <span className={styles.brandWordmarkTop}>PASET</span>
              <span className={styles.brandWordmarkBottom}>MALI</span>
            </span>
            <div className={styles.brandPartners} aria-label="Partenaires du projet">
              <img
                src="/logos/Armoiries_Mali.png"
                alt="République du Mali"
                className={styles.brandLogoSmall}
              />
              <span className={styles.brandDivider} aria-hidden="true" />
              <img
                src="/logos/Flag_of_Japan.png"
                alt="Japon"
                className={styles.brandLogoSmall}
              />
              <span className={styles.brandDivider} aria-hidden="true" />
              <img
                src="/logos/PNUD-Logo-White-Large.png"
                alt="PNUD"
                className={styles.brandLogo}
              />
            </div>
          </div>
          <p className={styles.eyebrow}>PNUD Mali · UNDP-MLI-00492</p>
          <h2 className={styles.visualTitle}>
            Suivi socio-environnemental des sites de teinture artisanale.
          </h2>
          <ul className={styles.metaList}>
            <li><span>{stats?.sitesSuivis ?? '—'}</span> sites suivis</li>
            <li><span>{stats?.resultatsAnalyses ?? '—'}</span> résultats d'analyses</li>
            <li><span>{stats?.seuilsNormatifs ?? '—'}</span> seuils normatifs</li>
            <li>
              <span>{stats?.composantes ?? '—'}</span> composantes
              {stats?.composantesCodes && (
                <small> ({stats.composantesCodes.join(' · ')})</small>
              )}
            </li>
          </ul>
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
                autoComplete="off"
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
                autoComplete="off"
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


        </div>

        <footer className={styles.footer}>
          <p>© 2026 · <strong>PASET Mali</strong> — PNUD Mali · Consortium Sahel Analytics & Sahel environnement</p>
        </footer>
      </section>
    </main>
  );
}
