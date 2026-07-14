const PatientTreatments = {
    template: `
    <div class="container mt-4">
        <h2 class="mb-4"><i class="bi bi-file-medical text-primary"></i> My Treatments</h2>

        <div class="d-flex justify-content-end mb-3">
            <button @click="exportCSV" class="btn btn-success btn-sm" :disabled="exporting">
                <span v-if="exporting" class="spinner-border spinner-border-sm me-1"></span>
                <i class="bi bi-download"></i> Export as CSV
            </button>
        </div>

        <div v-if="exportMessage" class="alert"
             :class="exportMessage.type === 'success' ? 'alert-success' : 'alert-info'">
            {{ exportMessage.text }}
        </div>

        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
        </div>

        <div v-else>
            <div v-if="treatments.length > 0">
                <div class="card shadow mb-3" v-for="t in treatments" :key="t.id">
                    <div class="card-header bg-white d-flex justify-content-between align-items-center">
                        <div>
                            <strong>{{ t.date }}</strong>
                            <span class="text-muted ms-2">Dr. {{ t.doctor_name }}</span>
                        </div>
                        <span class="badge bg-success">Completed</span>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong><i class="bi bi-clipboard2-pulse"></i> Diagnosis:</strong></p>
                                <p>{{ t.treatment ? t.treatment.diagnosis : 'N/A' }}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong><i class="bi bi-capsule"></i> Prescription:</strong></p>
                                <p>{{ t.treatment && t.treatment.prescription ? t.treatment.prescription : 'No prescription' }}</p>
                            </div>
                        </div>
                        <div v-if="t.treatment && t.treatment.doctor_notes" class="mt-2">
                            <p><strong><i class="bi bi-journal-text"></i> Doctor Notes:</strong></p>
                            <p class="text-muted">{{ t.treatment.doctor_notes }}</p>
                        </div>
                        <div v-if="t.treatment && t.treatment.next_visit_date" class="mt-2">
                            <span class="badge bg-warning text-dark">
                                <i class="bi bi-calendar-event"></i> Next Visit: {{ t.treatment.next_visit_date }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="alert alert-info text-center">
                No treatment records found.
            </div>
        </div>
    </div>
    `,

    data() {
        return {
            treatments: [],

            loading: true,

            exporting: false,

            exportMessage: null
        };
    },

    async mounted() {
        await this.fetchTreatments();
    },

    methods: {
        async fetchTreatments() {
            this.loading = true;
            try {
                var res = await Store.apiCall('/api/patient/treatments');
                if (res.ok) {
                    this.treatments = await res.json();
                }
            } catch (e) {
                console.error('Failed to load treatments:', e);
            }
            this.loading = false;
        },

        async exportCSV() {
            this.exporting = true;
            this.exportMessage = null;
            try {
                var res = await Store.apiCall('/api/patient/export-treatments', { method: 'POST' });
                if (res.ok) {
                    var d = await res.json();
                    this.exportMessage = {
                        type: 'success',
                        text: d.message || 'Export started. Checking status...'
                    };
                    this.pollExport(d.task_id);
                } else {
                    var errData = await res.json();
                    this.exportMessage = {
                        type: 'info',
                        text: errData.error || 'Export request failed'
                    };
                }
            } catch (e) {
                this.exportMessage = { type: 'info', text: 'Error triggering export' };
            }
            this.exporting = false;
        },

        pollExport: function(taskId) {
            if (!taskId) {
                return;
            }

            var self = this; // capture 'this' so the inner function can use it
            var poll = function() {
                Store.apiCall('/api/patient/export-status/' + taskId)
                    .then(function(res) {
                        if (res.ok) {
                            return res.json().then(function(d) {
                                if (d.status === 'completed') {
                                    self.exportMessage = {
                                        type: 'success',
                                        text: 'CSV export completed! Check your email.'
                                    };
                                } else if (d.status === 'failed') {
                                    self.exportMessage = {
                                        type: 'info',
                                        text: 'Export failed: ' + (d.error || 'Unknown error')
                                    };
                                } else {
                                    setTimeout(poll, 2000);
                                }
                            });
                        }
                    })
                    .catch(function() {
                    });
            };

            setTimeout(poll, 2000);
        }
    }
};
