const DoctorAvailability = {
    template: `
    <div class="container mt-4">
        <h2 class="mb-4"><i class="bi bi-clock text-primary"></i> My Availability</h2>

        <div class="row g-4">
            <div class="col-md-5">
                <div class="card shadow">
                    <div class="card-header bg-white">
                        <h5 class="mb-0">Add Availability Slot</h5>
                    </div>
                    <div class="card-body">
                        <div v-if="error" class="alert alert-danger alert-dismissible fade show">
                            {{ error }}
                            <button type="button" class="btn-close" @click="error=''"></button>
                        </div>
                        <div v-if="success" class="alert alert-success alert-dismissible fade show">
                            {{ success }}
                            <button type="button" class="btn-close" @click="success=''"></button>
                        </div>

                        <form @submit.prevent="addSlot">
                            <div class="mb-3">
                                <label class="form-label">Date *</label>
                                <input type="date" class="form-control"
                                    v-model="form.date"
                                    required
                                    :min="minDate"
                                    :max="maxDate">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Start Time *</label>
                                <input type="time" class="form-control" v-model="form.start_time" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">End Time *</label>
                                <input type="time" class="form-control" v-model="form.end_time" required>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="bi bi-plus-circle"></i> Add Slot
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <div class="col-md-7">
                <div class="card shadow">
                    <div class="card-header bg-white">
                        <h5 class="mb-0">Current Availability (Next 7 Days)</h5>
                    </div>
                    <div class="card-body">
                        <div v-if="loading" class="text-center py-3">
                            <div class="spinner-border text-primary"></div>
                        </div>
                        <div v-else>
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr><th>Date</th><th>Start</th><th>End</th><th>Action</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="av in availabilities" :key="av.id">
                                            <td>{{ av.date }}</td>
                                            <td>{{ av.start_time }}</td>
                                            <td>{{ av.end_time }}</td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-danger" @click="removeSlot(av.id)">
                                                    <i class="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                        <tr v-if="availabilities.length === 0">
                                            <td colspan="4" class="text-center text-muted py-3">
                                                No availability set yet
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    data() {
        var today = new Date();
        var maxDateObj = new Date(today);
        maxDateObj.setDate(maxDateObj.getDate() + 7);

        var todayStr   = today.toISOString().split('T')[0];
        var maxDateStr = maxDateObj.toISOString().split('T')[0];

        return {
            availabilities: [],

            loading: true,

            form: {
                date: '',
                start_time: '09:00',
                end_time: '17:00'
            },

            error: '',
            success: '',

            minDate: todayStr,
            maxDate: maxDateStr
        };
    },

    async mounted() {
        await this.loadAvailability();
    },

    methods: {
        async loadAvailability() {
            this.loading = true;
            try {
                var res = await Store.apiCall('/api/doctor/availability');
                if (res.ok) {
                    this.availabilities = await res.json();
                }
            } catch (e) {
                console.error('Failed to load availability:', e);
            }
            this.loading = false;
        },

        async addSlot() {
            this.error = '';
            this.success = '';
            try {
                var res = await Store.apiCall('/api/doctor/availability', {
                    method: 'POST',
                    body: JSON.stringify(this.form)
                });
                var data = await res.json();
                if (res.ok) {
                    this.success = 'Availability slot added successfully!';
                    this.form = { date: '', start_time: '09:00', end_time: '17:00' };
                    await this.loadAvailability();
                } else {
                    this.error = data.error || 'Failed to add slot';
                }
            } catch (e) {
                this.error = 'Network error';
            }
        },

        async removeSlot(id) {
            var confirmed = confirm('Remove this availability slot?');
            if (!confirmed) {
                return;
            }
            await Store.apiCall('/api/doctor/availability/' + id, { method: 'DELETE' });
            await this.loadAvailability();
        }
    }
};
