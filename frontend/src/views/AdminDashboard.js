const AdminDashboard = {
    template: `
    <div class="container mt-4">
        <h2 class="mb-4"><i class="bi bi-speedometer2 text-primary"></i> Admin Dashboard</h2>

        <div class="row g-4 mb-4">
            <div class="col-md-3">
                <div class="card bg-primary text-white shadow">
                    <div class="card-body text-center">
                        <i class="bi bi-person-badge fs-1"></i>
                        <h3>{{ stats.total_doctors }}</h3>
                        <p class="mb-0">Total Doctors</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-success text-white shadow">
                    <div class="card-body text-center">
                        <i class="bi bi-people fs-1"></i>
                        <h3>{{ stats.total_patients }}</h3>
                        <p class="mb-0">Total Patients</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-info text-white shadow">
                    <div class="card-body text-center">
                        <i class="bi bi-calendar-check fs-1"></i>
                        <h3>{{ stats.total_appointments }}</h3>
                        <p class="mb-0">Total Appointments</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-warning text-dark shadow">
                    <div class="card-body text-center">
                        <i class="bi bi-building fs-1"></i>
                        <h3>{{ stats.total_departments }}</h3>
                        <p class="mb-0">Departments</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row g-4">
            <div class="col-md-6">
                <div class="card shadow">
                    <div class="card-header bg-white">
                        <h5 class="mb-0"><i class="bi bi-pie-chart"></i> Appointment Status</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="appointmentChart" height="250"></canvas>
                    </div>
                </div>
            </div>

            <div class="col-md-6">
                <div class="card shadow">
                    <div class="card-header bg-white">
                        <h5 class="mb-0"><i class="bi bi-lightning"></i> Quick Actions</h5>
                    </div>
                    <div class="card-body">
                        <div class="d-grid gap-2">
                            <router-link to="/admin/doctors"      class="btn btn-outline-primary">
                                <i class="bi bi-person-badge-fill"></i> Manage Doctors
                            </router-link>
                            <router-link to="/admin/patients"     class="btn btn-outline-success">
                                <i class="bi bi-people-fill"></i> Manage Patients
                            </router-link>
                            <router-link to="/admin/appointments" class="btn btn-outline-info">
                                <i class="bi bi-calendar-check-fill"></i> View Appointments
                            </router-link>
                            <router-link to="/admin/departments"  class="btn btn-outline-warning">
                                <i class="bi bi-building-fill"></i> Manage Departments
                            </router-link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    data() {
        return {
            stats: {
                total_doctors: 0,
                total_patients: 0,
                total_appointments: 0,
                total_departments: 0,
                appointments_booked: 0,
                appointments_completed: 0,
                appointments_cancelled: 0
            },

            chart: null
        };
    },

    async mounted() {
        await this.loadStats();
    },

    methods: {
        async loadStats() {
            try {
                var res = await Store.apiCall('/api/admin/dashboard');
                if (res.ok) {
                    this.stats = await res.json();

                    this.$nextTick(function() {
                        this.renderChart();
                    }.bind(this));
                }
            } catch (e) {
                console.error('Failed to load dashboard stats:', e);
            }
        },

        renderChart() {
            var ctx = document.getElementById('appointmentChart');
            if (!ctx) {
                return; // canvas not found - nothing to draw on
            }

            if (this.chart) {
                this.chart.destroy();
            }

            this.chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Booked', 'Completed', 'Cancelled'],
                    datasets: [{
                        data: [
                            this.stats.appointments_booked,
                            this.stats.appointments_completed,
                            this.stats.appointments_cancelled
                        ],
                        backgroundColor: ['#0d6efd', '#198754', '#dc3545']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
    }
};
