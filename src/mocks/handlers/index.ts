import type { HttpHandler } from 'msw';
import { authHandlers } from './auth';
import { sitesHandlers } from './sites';
import { indicatorsHandlers } from './indicators';
import { collectionsHandlers } from './collections';
import { labsHandlers } from './labs';
import { adminHandlers } from './admin';
import { alertsHandlers } from './alerts';
import { recommandationsHandlers } from './recommandations';
import { structuralsHandlers } from './structurals';
import { formulairesHandlers } from './formulaires';

export const handlers: HttpHandler[] = [
  ...authHandlers,
  ...sitesHandlers,
  ...indicatorsHandlers,
  ...collectionsHandlers,
  ...labsHandlers,
  ...adminHandlers,
  ...alertsHandlers,
  ...recommandationsHandlers,
  ...structuralsHandlers,
  ...formulairesHandlers,
];
