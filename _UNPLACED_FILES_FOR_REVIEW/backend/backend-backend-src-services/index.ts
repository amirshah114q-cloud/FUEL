import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import driverRoutes from './driver.routes';
import vehicleRoutes from './vehicle.routes';
import fuelRoutes from './fuel.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/drivers', driverRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/fuel', fuelRoutes);

export default router;