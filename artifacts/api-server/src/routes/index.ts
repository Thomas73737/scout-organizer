import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storageRouter from "./storage";
import usersRouter from "./users";
import accessRequestsRouter from "./accessRequests";
import attendanceRouter from "./attendance";
import announcementsRouter from "./announcements";
import postsRouter from "./posts";
import notificationsRouter from "./notifications";
import pushNotificationsRouter from "./pushNotifications";
import chatRouter from "./chat";
import pointsRouter from "./points";
import calendarRouter from "./calendar";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(storageRouter);
router.use(usersRouter);
router.use(accessRequestsRouter);
router.use(attendanceRouter);
router.use(announcementsRouter);
router.use(postsRouter);
router.use(notificationsRouter);
router.use(pushNotificationsRouter);
router.use(chatRouter);
router.use(pointsRouter);
router.use(calendarRouter);

export default router;
