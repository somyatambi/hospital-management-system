const routes = [
    { path: '/', redirect: '/login' },

    { path: '/login',    component: Login,    meta: { guest: true } },
    { path: '/register', component: Register, meta: { guest: true } },

    { path: '/admin/dashboard',   component: AdminDashboard,   meta: { requiresAuth: true, role: 'admin' } },
    { path: '/admin/doctors',     component: AdminDoctors,     meta: { requiresAuth: true, role: 'admin' } },
    { path: '/admin/patients',    component: AdminPatients,    meta: { requiresAuth: true, role: 'admin' } },
    { path: '/admin/appointments',component: AdminAppointments,meta: { requiresAuth: true, role: 'admin' } },
    { path: '/admin/departments', component: AdminDepartments, meta: { requiresAuth: true, role: 'admin' } },

    { path: '/doctor/dashboard',    component: DoctorDashboard,      meta: { requiresAuth: true, role: 'doctor' } },
    { path: '/doctor/appointments', component: DoctorAppointments,   meta: { requiresAuth: true, role: 'doctor' } },
    { path: '/doctor/availability', component: DoctorAvailability,   meta: { requiresAuth: true, role: 'doctor' } },
    { path: '/doctor/patients',     component: DoctorPatientHistory, meta: { requiresAuth: true, role: 'doctor' } },

    { path: '/patient/dashboard',    component: PatientDashboard,    meta: { requiresAuth: true, role: 'patient' } },
    { path: '/patient/doctors',      component: PatientDoctors,      meta: { requiresAuth: true, role: 'patient' } },
    { path: '/patient/appointments', component: PatientAppointments, meta: { requiresAuth: true, role: 'patient' } },
    { path: '/patient/treatments',   component: PatientTreatments,   meta: { requiresAuth: true, role: 'patient' } },
    { path: '/patient/profile',      component: PatientProfile,      meta: { requiresAuth: true, role: 'patient' } },

    { path: '/:pathMatch(.*)*', redirect: '/login' }
];

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes: routes
});

router.beforeEach(function(to, from, next) {
    var isLoggedIn = Store.state.isAuthenticated;
    var userRole   = Store.state.user ? Store.state.user.role : null;

    if (to.meta.requiresAuth && !isLoggedIn) {
        next('/login');

    } else if (to.meta.guest && isLoggedIn) {
        if (userRole === 'admin') {
            next('/admin/dashboard');
        } else if (userRole === 'doctor') {
            next('/doctor/dashboard');
        } else {
            next('/patient/dashboard');
        }

    } else if (to.meta.role && to.meta.role !== userRole) {
        if (userRole === 'admin') {
            next('/admin/dashboard');
        } else if (userRole === 'doctor') {
            next('/doctor/dashboard');
        } else {
            next('/patient/dashboard');
        }

    } else {
        next();
    }
});
