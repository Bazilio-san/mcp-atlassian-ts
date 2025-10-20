import * as dotenv from 'dotenv';

const generalEnv = dotenv.config();
export const dotEnvResult = generalEnv.parsed;
