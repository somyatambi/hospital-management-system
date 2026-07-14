const DoctorAppointments = {
    template: `
    <div class="container mt-4">
        <h2 class="mb-4"><i class="bi bi-calendar-check text-primary"></i> My Appointments</h2>

        <div class="card shadow mb-4">
            <div class="card-body">
                <select class="form-select w-auto" v-model="statusFilter" @change="loadAppointments">
                    <option value="">All</option>
                    <option value="Booked">Booked</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
            </div>
        </div>

        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
        </div>

        <div class="table-responsive" v-else>
            <table class="table table-hover shadow-sm">
                <thead class="table-primary">
                    <tr><th>Date</th><th>Time</th><th>Patient</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    <tr v-for="a in appointments" :key="a.id">
                        <td>{{ a.date }}</td>
                        <td>{{ a.time }}</td>
                        <td>{{ a.patient_name }}</td>
                        <td>{{ a.reason || 'N/A' }}</td>
                        <td><span :class="statusBadge(a.status)">{{ a.status }}</span></td>
                        <td>
                            <template v-if="a.status === 'Booked'">
                                <button class="btn btn-sm btn-success me-1" @click="openCompleteModal(a)">
                                    <i class="bi bi-check-circle"></i> Complete
                                </button>
                                <button class="btn btn-sm btn-danger" @click="cancelAppointment(a.id)">
                                    <i class="bi bi-x-circle"></i> Cancel
                                </button>
                            </template>
                            <template v-if="a.status === 'Completed'">
                                <button class="btn btn-sm btn-outline-info" @click="viewTreatment(a)">
                                    <i class="bi bi-eye"></i> Treatment
                                </button>
                                <button class="btn btn-sm btn-outline-primary ms-1" @click="openHistoryModal(a.patient_id)">
                                    <i class="bi bi-clock-history"></i> History
                                </button>
                            </template>
                        </td>
                    </tr>
                    <tr v-if="appointments.length === 0">
                        <td colspan="6" class="text-center text-muted py-4">No appointments found</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="modal fade"
             :class="{ show: showCompleteModal }"
             :style="showCompleteModal ? 'display:block' : 'display:none'"
             tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            Complete Appointment
                            <span v-if="selectedAppt"> - {{ selectedAppt.patient_name }}</span>
                        </h5>
                        <button type="button" class="btn-close" @click="showCompleteModal = false"></button>
                    </div>
                    <form @submit.prevent="completeAppointment">
                        <div class="modal-body">
                            <div v-if="modalError" class="alert alert-danger">{{ modalError }}</div>

                            <div class="mb-3">
                                <label class="form-label">Diagnosis *</label>
                                <textarea class="form-control" v-model="treatmentForm.diagnosis" rows="3" required
                                    placeholder="Describe the diagnosis..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Prescription</label>
                                <textarea class="form-control" v-model="treatmentForm.prescription" rows="3"
                                    placeholder="List medications and instructions..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Doctor Notes</label>
                                <textarea class="form-control" v-model="treatmentForm.doctor_notes" rows="2"
                                    placeholder="Any additional notes..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Next Visit Date</label>
                                <input type="date" class="form-control" v-model="treatmentForm.next_visit_date">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" @click="showCompleteModal = false">Cancel</button>
                            <button type="submit" class="btn btn-success">Mark as Completed</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <div v-if="showCompleteModal" class="modal-backdrop fade show"></div>

        <div class="modal fade"
             :class="{ show: showTreatmentModal }"
             :style="showTreatmentModal ? 'display:block' : 'display:none'"
             tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Treatment Details</h5>
                        <button type="button" class="btn-close" @click="showTreatmentModal = false"></button>
                    </div>
                    <div class="modal-body" v-if="selectedTreatment">
                        <p><strong>Diagnosis:</strong> {{ selectedTreatment.diagnosis }}</p>
                        <p><strong>Prescription:</strong> {{ selectedTreatment.prescription || 'None' }}</p>
                        <p><strong>Doctor Notes:</strong> {{ selectedTreatment.doctor_notes || 'None' }}</p>
                        <p><strong>Next Visit:</strong> {{ selectedTreatment.next_visit_date || 'Not scheduled' }}</p>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="showTreatmentModal" class="modal-backdrop fade show"></div>

        <div class="modal fade"
             :class="{ show: showHistoryModal }"
             :style="showHistoryModal ? 'display:block' : 'display:none'"
             tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Patient Appointment History</h5>
                        <button type="button" class="btn-close" @click="showHistoryModal = false"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr><th>Date</th><th>Status</th><th>Diagnosis</th><th>Prescription</th></tr>
                                </thead>
                                <tbody>
                                    <tr v-for="h in patientHistory" :key="h.id">
                                        <td>{{ h.date }}</td>
                                        <td>{{ h.status }}</td>
                                        <td>{{ h.treatment ? h.treatment.diagnosis : 'N/A' }}</td>
                                        <td>{{ h.treatment ? h.treatment.prescription : 'N/A' }}</td>
                                    </tr>
                                    <tr v-if="patientHistory.length === 0">
                                        <td colspan="4" class="text-center text-muted">No history found</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="showHistoryModal" class="modal-backdrop fade show"></div>
    </div>
    `,

    data() {
        return {
            appointments: [],
            loading: true,

            statusFilter: '',

            showCompleteModal: false,
            showTreatmentModal: false,
            showHistoryModal: false,

            selectedAppt: null,

            selectedTreatment: null,

            patientHistory: [],

            modalError: '',

            treatmentForm: {
                diagnosis: '',
                prescription: '',
                doctor_notes: '',
                next_visit_date: ''
            }
        };
    },

    async mounted() {
        await this.loadAppointments();
    },

    methods: {
        async loadAppointments() {
            this.loading = true;
            try {
                var url = '/api/doctor/appointments';
                if (this.statusFilter) {
                    url = url + '?status=' + this.statusFilter;
                }
                var res = await Store.apiCall(url);
                if (res.ok) {
                    this.appointments = await res.json();
                }
            } catch (e) {
                console.error('Failed to load appointments:', e);
            }
            this.loading = false;
        },

        statusBadge: function(status) {
            if (status === 'Booked') { return 'badge bg-primary'; }
            if (status === 'Completed') { return 'badge bg-success'; }
            return 'badge bg-danger';
        },

        openCompleteModal: function(appt) {
            this.selectedAppt = appt;
            this.treatmentForm = {
                diagnosis: '',
                prescription: '',
                doctor_notes: '',
                next_visit_date: ''
            };
            this.modalError = '';
            this.showCompleteModal = true;
        },

        async completeAppointment() {
            this.modalError = '';
            try {
                var url = '/api/doctor/appointments/' + this.selectedAppt.id + '/complete';
                var res = await Store.apiCall(url, {
                    method: 'PUT',
                    body: JSON.stringify(this.treatmentForm)
                });
                var data = await res.json();
                if (res.ok) {
                    this.showCompleteModal = false;
                    await this.loadAppointments();
                } else {
                    this.modalError = data.error || 'Failed to complete appointment';
                }
            } catch (e) {
                this.modalError = 'Network error';
            }
        },

        async cancelAppointment(id) {
            var confirmed = confirm('Cancel this appointment?');
            if (!confirmed) {
                return;
            }
            await Store.apiCall('/api/doctor/appointments/' + id + '/cancel', { method: 'PUT' });
            await this.loadAppointments();
        },

        viewTreatment: function(appt) {
            this.selectedTreatment = appt.treatment;
            this.showTreatmentModal = true;
        },

        async openHistoryModal(patientId) {
            try {
                var res = await Store.apiCall('/api/doctor/patients/' + patientId + '/history');
                if (res.ok) {
                    this.patientHistory = await res.json();
                    this.showHistoryModal = true;
                }
            } catch (e) {
                console.error('Failed to load patient history:', e);
            }
        }
    }
};
