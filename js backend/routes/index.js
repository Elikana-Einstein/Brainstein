
import { Router } from 'express';
import * as routes from '../database/router.js';

const router = Router();

router.post('/login', routes.login);
router.post('/signup', routes.signup);

router.post('/canvas', routes.addCanvas);
router.get('/canvas/:id', routes.getCanvas);

router.post('/slide', routes.addSlide);
router.get('/slides/:id', routes.getSlides);
router.put('/slide/:slideId', routes.updateSlide);
router.delete('/slide/:slideId', routes.deleteSlide);

export default router;
