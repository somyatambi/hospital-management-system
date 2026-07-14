const PatientAppointments = {
    template: `
    <div class="container mt-4">
        <h2 class="mb-4"><i class="bi bi-calendar-check text-primary"></i> My Appointments</h2>

        <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="btn-group">
                <button v-for="s in ['All','Booked','Completed','Cancelled']" :key="s"
                    :class="['btn btn-sm', statusFilter === s ? 'btn-primary' : 'btn-outline-primary']"
                    @click="statusFilter = s">{{ s }}
                </button>
            </div>
            <router-link to="/patient/doctors" class="btn btn-primary btn-sm">
                <i class="bi bi-plus-lg"></i> Book New
            </router-link>
        </div>

        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
        </div>

        <div v-else>
            <div class="table-responsive" v-if="filteredAppointments.length > 0">
                <table class="table table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Date</th><th>Time</th><th>Doctor</th><th>Specialization</th>
                            <th>Status</th><th>Reason</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="a in filteredAppointments" :key="a.id">
                            <td>{{ a.date }}</td>
                            <td>{{ a.time }}</td>
                            <td>Dr. {{ a.doctor_name }}</td>
                            <td>{{ a.doctor_specialization }}</td>
                            <td><span :class="statusBadge(a.status)">{{ a.status }}</span></td>
                            <td><small>{{ a.reason || '-' }}</small></td>
                            <td>
                                <div class="btn-group btn-group-sm">
                                    <button v-if="a.status === 'Booked'" class="btn btn-outline-warning"
                                        @click="openReschedule(a)" title="Reschedule">
                                        <i class="bi bi-arrow-repeat"></i>
                                    </button>
                                    <button v-if="a.status === 'Booked'" class="btn btn-outline-danger"
                                        @click="cancelAppointment(a.id)" title="Cancel">
                                        <i class="bi bi-x-circle"></i>
                                    </button>
                                    <button v-if="a.treatment" class="btn btn-outline-info"
                                        @click="viewTreatment(a)" title="View Treatment">
                                        <i class="bi bi-file-medical"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-else class="alert alert-info text-center">No appointments found.</div>
        </div>

        <div class="modal fade" id="rescheduleModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content" v-if="rescheduleAppt">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title">
                            <i class="bi bi-arrow-repeat"></i> Reschedule Appointment
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Current: <strong>{{ rescheduleAppt.date }}</strong> at <strong>{{ rescheduleAppt.time }}</strong></p>
                        <div class="mb-3">
                            <label class="form-label">New Date</label>
                            <input v-model="newDate" type="date" class="form-control" :min="todayStr">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">New Time</label>
                            <input v-model="newTime" type="time" class="form-control">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button @click="submitReschedule" class="btn btn-warning" :disabled="!newDate || !newTime">
                            Reschedule
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="treatmentModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content" v-if="viewingTreatment">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-file-medical"></i> Treatment Details
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Diagnosis:</strong> {{ viewingTreatment.diagnosis }}</p>
                        <p><strong>Prescription:</strong> {{ viewingTreatment.prescription || 'N/A' }}</p>
                        <p><strong>Doctor Notes:</strong> {{ viewingTreatment.doctor_notes || 'N/A' }}</p>
                        <p v-if="viewingTreatment.next_visit_date">
                            <strong>Next Visit:</strong> {{ viewingTreatment.next_visit_date }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    data() {
        return {
            appointments: [],

            loading: true,

            statusFilter: 'All',

            rescheduleAppt: null,

            newDate: '',
            newTime: '',

            viewingTreatment: null,

            rescheduleModal: null,
            treatmentModal: null
        };
    },

    computed: {
        filteredAppointments: function() {
            if (this.statusFilter === 'All') {
                return this.appointments;
            }

            var result = [];
            for (var i = 0; i < this.appointments.length; i++) {
                var appt = this.appointments[i];
                if (appt.status === this.statusFilter) {
                    result.push(appt);
                }
            }
            return result;
        },

        todayStr: function() {
            return new Date().toISOString().split('T')[0];
        }
    },

    async mounted() {
        await this.fetchAppointments();
    },

    methods: {
        async fetchAppointments() {
            this.loading = true;
            try {
                var res = await Store.apiCall('/api/patient/appointments');
                if (res.ok) {
                    this.appointments = await res.json();
                }
            } catch (e) {
                console.error('Failed to load appointments:', e);
            }
            this.loading = false;
        },

        statusBadge: function(s) {
            if (s === 'Booked') { return 'badge bg-primary'; }
            if (s === 'Completed') { return 'badge bg-success'; }
            return 'badge bg-danger';
        },

        openReschedule: function(a) {
            this.rescheduleAppt = a;
            this.newDate = '';
            this.newTime = '';

            if (!this.rescheduleModal) {
                this.rescheduleModal = new bootstrap.Modal(document.getElementById('rescheduleModal'));
            }
            this.rescheduleModal.show();
        },

        async submitReschedule() {
            try {
                var url = '/api/patient/appointments/' + this.rescheduleAppt.id + '/reschedule';
                var res = await Store.apiCall(url, {
                    method: 'PUT',
                    body: JSON.stringify({ date: this.newDate, time: this.newTime })
                });
                if (res.ok) {
                    this.rescheduleModal.hide();
                    await this.fetchAppointments();
                } else {
                    var d = await res.json();
                    alert(d.error || 'Reschedule failed');
                }
            } catch (e) {
                alert('Network error while rescheduling');
            }
        },

        async cancelAppointment(id) {
            var confirmed = confirm('Cancel this appointment?');
            if (!confirmed) {
                return;
            }
            try {
                var res = await Store.apiCall('/api/patient/appointments/' + id + '/cancel', { method: 'PUT' });
                if (res.ok) {
                    await this.fetchAppointments();
                } else {
                    var d = await res.json();
                    alert(d.error || 'Cancel failed');
                }
            } catch (e) {
                alert('Network error while cancelling');
            }
        },

        viewTreatment: function(a) {
            this.viewingTreatment = a.treatment;

            if (!this.treatmentModal) {
                this.treatmentModal = new bootstrap.Modal(document.getElementById('treatmentModal'));
            }
            this.treatmentModal.show();
        }
    }
};
