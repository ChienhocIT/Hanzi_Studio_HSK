import {handleTutor} from '../server/tutor.mjs';
// Vercel Function entry for POST /api/tutor; the logic lives in server/tutor.mjs so it can be tested directly.
export default {fetch:request=>handleTutor(request)};
