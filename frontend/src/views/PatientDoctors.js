const PatientDoctors = {
    template: `
    <div class="container mt-4">
        <h2 class="mb-4"><i class="bi bi-person-badge text-primary"></i> Find a Doctor</h2>

        <div class="card shadow mb-4">
            <div class="card-body">
                <div class="row g-3">
                    <div class="col-md-4">
                        <input v-model="search" class="form-control"
                               placeholder="Search by name or specialization..."
                               @input="fetchDoctors">
                    </div>
                    <div class="col-md-3">
                        <select v-model="departmentFilter" class="form-select" @change="fetchDoctors">
                            <option value="">All Departments</option>
                            <option v-for="d in departments" :value="d.id" :key="d.id">{{ d.name }}</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <select v-model="specializationFilter" class="form-select" @change="fetchDoctors">
                            <option value="">All Specializations</option>
                            <option v-for="s in specializations" :value="s" :key="s">{{ s }}</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
        </div>

        <div v-else class="row g-4">
            <div class="col-md-6 col-lg-4" v-for="doc in doctors" :key="doc.id">
                <div class="card shadow h-100">
                    <div class="card-body">
                        <div class="text-center mb-3">
                            <div class="bg-primary text-white rounded-circle d-inline-flex justify-content-center align-items-center"
                                 style="width:60px;height:60px;font-size:1.5rem;">
                                {{ doc.name ? doc.name.charAt(0) : 'D' }}
                            </div>
                        </div>
                        <h5 class="text-center">Dr. {{ doc.name }}</h5>
                        <p class="text-center text-muted mb-1">{{ doc.specialization }}</p>
                        <p class="text-center text-muted mb-3"><small>{{ doc.department_name }}</small></p>
                        <div class="d-flex justify-content-around mb-3">
                            <small><i class="bi bi-mortarboard"></i> {{ doc.qualification }}</small>
                            <small><i class="bi bi-clock-history"></i> {{ doc.experience_years }}y exp</small>
                        </div>
                        <p class="text-center">
                            <strong class="text-success">Rs {{ doc.consultation_fee }}</strong>
                            <small class="text-muted"> per visit</small>
                        </p>
                        <div class="d-grid gap-2">
                            <button @click="viewDoctor(doc.id)" class="btn btn-outline-primary btn-sm">
                                <i class="bi bi-calendar-plus"></i> View Availability &amp; Book
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="doctors.length === 0" class="col-12">
                <div class="alert alert-info text-center">No doctors found matching your criteria.</div>
            </div>
        </div>

        <div class="modal fade" id="doctorModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content" v-if="selectedDoctor">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">Dr. {{ selectedDoctor.name }}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">

                        <div class="row mb-4">
                            <div class="col-md-6">
                                <p><strong>Specialization:</strong> {{ selectedDoctor.specialization }}</p>
                                <p><strong>Department:</strong> {{ selectedDoctor.department_name }}</p>
                                <p><strong>Qualification:</strong> {{ selectedDoctor.qualification }}</p>
                                <p><strong>Experience:</strong> {{ selectedDoctor.experience_years }} years</p>
                                <p><strong>Fee:</strong> Rs {{ selectedDoctor.consultation_fee }}</p>
                            </div>
                            <div class="col-md-6">
                                <p v-if="selectedDoctor.bio"><strong>About:</strong> {{ selectedDoctor.bio }}</p>
                            </div>
                        </div>

                        <h6 class="border-bottom pb-2 mb-3">
                            <i class="bi bi-calendar3"></i> Available Slots
                        </h6>

                        <div v-if="loadingSlots" class="text-center py-3">
                            <div class="spinner-border spinner-border-sm text-primary"></div>
                        </div>

                        <div v-else>
                            <div v-if="availability.length === 0" class="alert alert-warning">
                                No available slots for this doctor.
                            </div>
                            <div v-else>
                                <div class="d-flex gap-3 mb-3 small">
                                    <span>
                                        <span class="badge border border-primary text-primary me-1"
                                              style="font-size:0.7rem;">&#x25A1;</span> Available
                                    </span>
                                    <span>
                                        <span class="badge bg-success text-white me-1"
                                              style="font-size:0.7rem;">&#x25A0;</span> Selected
                                    </span>
                                    <span>
                                        <span class="badge bg-secondary text-white me-1"
                                              style="font-size:0.7rem;">&#x25A0;</span> Booked
                                    </span>
                                </div>

                                <div v-for="(slots, date) in groupedSlots" :key="date" class="mb-4">
                                    <div class="d-flex align-items-center mb-2">
                                        <strong class="me-2">
                                            <i class="bi bi-calendar-date me-1"></i>{{ formatDate(date) }}
                                        </strong>
                                        <small class="text-muted">({{ freeCount(slots) }} of {{ slots.length }} slots free)</small>
                                    </div>

                                    <div class="d-flex flex-wrap gap-2">
                                        <button v-for="slot in slots" :key="slot.id"
                                            @click="selectSlot(slot)"
                                            :disabled="slot.is_booked"
                                            :title="slot.is_booked ? 'Already booked' : slot.start_time + ' - ' + slot.end_time"
                                            :class="slotBtnClass(slot)">
                                            <i v-if="slot.is_booked" class="bi bi-lock-fill me-1"></i>
                                            {{ slot.start_time }}&ndash;{{ slot.end_time }}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-if="selectedSlot" class="mt-4 p-3 border border-success rounded bg-light">
                            <h6 class="text-success mb-3">
                                <i class="bi bi-calendar-check me-1"></i> Confirm Your Appointment
                            </h6>
                            <div class="row mb-3">
                                <div class="col-sm-6">
                                    <p class="mb-1">
                                        <strong><i class="bi bi-calendar3 me-1"></i>Date:</strong>
                                        {{ formatDate(selectedSlot.date) }}
                                    </p>
                                    <p class="mb-0">
                                        <strong><i class="bi bi-clock me-1"></i>Slot:</strong>
                                        {{ selectedSlot.start_time }} &ndash; {{ selectedSlot.end_time }}
                                    </p>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Reason for Visit <span class="text-muted">(optional)</span></label>
                                <textarea v-model="bookingReason" class="form-control" rows="2"
                                          placeholder="Describe your symptoms or reason..."></textarea>
                            </div>
                            <button @click="bookAppointment" class="btn btn-success" :disabled="booking">
                                <span v-if="booking" class="spinner-border spinner-border-sm me-1"></span>
                                <i class="bi bi-check-circle me-1"></i> Confirm Booking
                            </button>
                            <button class="btn btn-outline-secondary ms-2" @click="selectedSlot = null">
                                Cancel
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>

    </div>
    `,

    data() {
        return {
            doctors: [],

            departments: [],

            specializations: [],

            search: '',

            departmentFilter: '',

            specializationFilter: '',

            loading: true,

            loadingSlots: false,

            selectedDoctor: null,

            availability: [],

            selectedSlot: null,

            bookingReason: '',

            booking: false,

            modal: null
        };
    },

    computed: {
        groupedSlots: function() {
            var groups = {};
            for (var i = 0; i < this.availability.length; i++) {
                var slot = this.availability[i];
                var date = slot.date;
                if (!groups[date]) {
                    groups[date] = [];
                }
                groups[date].push(slot);
            }
            return groups;
        }
    },

    async mounted() {
        var depQ = this.$route.query.department_id;
        if (depQ) {
            this.departmentFilter = parseInt(depQ);
        }

        await this.fetchDoctors();

        try {
            var res = await Store.apiCall('/api/patient/dashboard');
            if (res.ok) {
                var d = await res.json();
                this.departments = d.departments || [];
            }
        } catch (e) {
            console.error('Could not load departments:', e);
        }
    },

    methods: {
        async fetchDoctors() {
            this.loading = true;
            try {
                var url = '/api/patient/doctors?';
                if (this.search) {
                    url = url + 'search=' + encodeURIComponent(this.search) + '&';
                }
                if (this.departmentFilter) {
                    url = url + 'department_id=' + this.departmentFilter + '&';
                }
                if (this.specializationFilter) {
                    url = url + 'specialization=' + encodeURIComponent(this.specializationFilter) + '&';
                }

                var res = await Store.apiCall(url);
                if (res.ok) {
                    this.doctors = await res.json();

                    var seen = {};
                    var specs = [];
                    for (var i = 0; i < this.doctors.length; i++) {
                        var spec = this.doctors[i].specialization;
                        if (spec && !seen[spec]) {
                            seen[spec] = true;
                            specs.push(spec);
                        }
                    }
                    specs.sort();
                    this.specializations = specs;
                }
            } catch (e) {
                console.error('Error fetching doctors:', e);
            }
            this.loading = false;
        },

        async viewDoctor(id) {
            this.selectedSlot = null;
            this.bookingReason = '';
            this.loadingSlots = true;

            try {
                var res = await Store.apiCall('/api/patient/doctors/' + id);
                if (res.ok) {
                    var d = await res.json();
                    this.selectedDoctor = d;
                    this.availability = d.availabilities || [];
                }
            } catch (e) {
                console.error('Error loading doctor details:', e);
            }

            this.loadingSlots = false;

            if (!this.modal) {
                this.modal = new bootstrap.Modal(document.getElementById('doctorModal'));
            }
            this.modal.show();
        },

        formatDate: function(dateStr) {
            var d = new Date(dateStr + 'T00:00:00');
            return d.toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        },

        freeCount: function(slots) {
            var count = 0;
            for (var i = 0; i < slots.length; i++) {
                if (!slots[i].is_booked) {
                    count = count + 1;
                }
            }
            return count;
        },

        slotBtnClass: function(slot) {
            if (slot.is_booked) {
                return 'btn btn-sm btn-secondary';
            }
            if (this.selectedSlot && this.selectedSlot.id === slot.id) {
                return 'btn btn-sm btn-success';
            }
            return 'btn btn-sm btn-outline-primary';
        },

        selectSlot: function(slot) {
            if (slot.is_booked) {
                return;
            }
            this.selectedSlot = slot;
        },

        async bookAppointment() {
            if (!this.selectedSlot) {
                return;
            }

            this.booking = true;
            try {
                var res = await Store.apiCall('/api/patient/appointments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        doctor_id: this.selectedDoctor.id,
                        date: this.selectedSlot.date,
                        time: this.selectedSlot.start_time,
                        reason: this.bookingReason
                    })
                });

                if (res.ok) {
                    alert('Appointment booked successfully!');
                    this.modal.hide();
                    this.$router.push('/patient/appointments');
                } else {
                    var d = await res.json();
                    alert(d.error || 'Failed to book appointment');
                }
            } catch (e) {
                alert('Error booking appointment. Please try again.');
            }

            this.booking = false;
        }
    }
};
