import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Plus, Trash2, Car, Search, ChevronDown, Loader2 } from 'lucide-react';
import { FenderVehicle, fenderApi } from '../lib/fenderApi';
import { trackLeadSubmission } from '../lib/analytics';
import { useInventory } from '../lib/apiHooks';

interface IncomeSource {
  pay_type: 'salary' | 'hourly';
  amount: string;
  hours_per_week: string;
  job_title: string;
  employer_name: string;
  employer_type: 'company' | 'self_employed';
  tax_type: 'w2' | '1099';
  years_at_job: string;
  months_at_job: string;
}

interface VehicleInterestForm {
  enabled: boolean;
  source_type: 'inventory' | 'manual';
  vehicle_id: string;
  vin: string;
  stock_number: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  price: string;
  mileage: string;
  vehicle_url: string;
  location_id: string;
}

const EMPTY_VEHICLE_INTEREST: VehicleInterestForm = {
  enabled: false,
  source_type: 'inventory',
  vehicle_id: '',
  vin: '',
  stock_number: '',
  year: '',
  make: '',
  model: '',
  trim: '',
  price: '',
  mileage: '',
  vehicle_url: '',
  location_id: '',
};

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;

const sanitizeText = (value: string, maxLength = 120) => value.trim().replace(/\s+/g, ' ').slice(0, maxLength);

const parseOptionalCurrency = (value: string): number | null => {
  const normalized = value.replace(/[$,\s]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function Financing() {
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    ssn: '',
    date_of_birth: '',
    email: '',
    phone: '',
    address: '',
    address_unit: '',
    city: '',
    state: '',
    zip: '',
    years_at_address: '',
    months_at_address: '',
    previous_address: '',
    previous_address_unit: '',
    previous_city: '',
    previous_state: '',
    previous_zip: '',
    bank_name: '',
    housing_status: '',
    monthly_housing_payment: '',
    salesperson_name: '',
    preferred_down_payment: '',
    hp: '', // honeypot
  });

  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([
    {
      pay_type: 'salary',
      amount: '',
      hours_per_week: '',
      job_title: '',
      employer_name: '',
      employer_type: 'company',
      tax_type: 'w2',
      years_at_job: '',
      months_at_job: '',
    },
  ]);

  const [previousEmployment, setPreviousEmployment] = useState({
    employer_name: '',
    job_title: '',
    years_worked: '',
    months_worked: '',
  });
  const [vehicleInterest, setVehicleInterest] = useState<VehicleInterestForm>(EMPTY_VEHICLE_INTEREST);
  const [vehicleValidationError, setVehicleValidationError] = useState<string | null>(null);

  const { data: inventoryData, isLoading: loadingInventory } = useInventory({ limit: 1000 });
  const inventoryOptions = inventoryData?.vehicles || [];

  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const vehicleDropdownRef = useRef<HTMLDivElement>(null);

  const filteredInventory = inventoryOptions.filter((vehicle) => {
    const label = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`.toLowerCase();
    return label.includes(vehicleSearchTerm.toLowerCase());
  });

  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const addIncomeSource = () => {
    if (incomeSources.length < 4) {
      setIncomeSources([
        ...incomeSources,
        {
          pay_type: 'salary',
          amount: '',
          hours_per_week: '',
          job_title: '',
          employer_name: '',
          employer_type: 'company',
          tax_type: 'w2',
          years_at_job: '',
          months_at_job: '',
        },
      ]);
    }
  };

  const removeIncomeSource = (index: number) => {
    if (incomeSources.length > 1) {
      setIncomeSources(incomeSources.filter((_, i) => i !== index));
    }
  };

  const updateIncomeSource = (index: number, field: keyof IncomeSource, value: string) => {
    const updated = [...incomeSources];
    updated[index] = { ...updated[index], [field]: value };
    setIncomeSources(updated);
  };

  const getTotalTimeAtAddress = () => {
    const years = parseInt(formData.years_at_address) || 0;
    const months = parseInt(formData.months_at_address) || 0;
    return years * 12 + months;
  };

  const getTotalTimeAtJob = (income: IncomeSource) => {
    const years = parseInt(income.years_at_job) || 0;
    const months = parseInt(income.months_at_job) || 0;
    return years * 12 + months;
  };

  const needsPreviousAddress = getTotalTimeAtAddress() < 24;
  const needsPreviousEmployment = incomeSources.length > 0 && getTotalTimeAtJob(incomeSources[0]) < 24;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target as Node)) {
        setShowVehicleDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectInventoryVehicle = (vehicle: FenderVehicle) => {
    const label = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`.trim();
    setVehicleSearchTerm(label);
    setShowVehicleDropdown(false);

    setVehicleInterest((prev) => ({
      ...prev,
      enabled: true,
      source_type: 'inventory',
      vehicle_id: vehicle.id,
      vin: vehicle.vin || '',
      stock_number: vehicle.stock_number || '',
      year: vehicle.year ? String(vehicle.year) : '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      trim: vehicle.trim || '',
      price: vehicle.price ? String(vehicle.price) : '',
      mileage: vehicle.mileage ? String(vehicle.mileage) : '',
      vehicle_url: vehicle.slug ? `/inventory/${vehicle.slug}` : '',
    }));
  };

  const validateVehicleInterest = (): boolean => {
    if (!vehicleInterest.enabled) {
      setVehicleValidationError(null);
      return true;
    }

    if (!vehicleInterest.vehicle_id) {
      setVehicleValidationError('Please select a vehicle from inventory.');
      return false;
    }

    const hasCoreVehicle = !!(vehicleInterest.year && vehicleInterest.make && vehicleInterest.model);
    const hasVin = !!vehicleInterest.vin;
    const hasStock = !!vehicleInterest.stock_number;

    if (!hasCoreVehicle && !hasVin && !hasStock) {
      setVehicleValidationError('Vehicle data incomplete. Please select a different vehicle.');
      return false;
    }

    if (hasVin && !VIN_REGEX.test(vehicleInterest.vin.toUpperCase())) {
      setVehicleValidationError('VIN must be 17 characters and exclude I, O, and Q.');
      return false;
    }

    setVehicleValidationError(null);
    return true;
  };

  const buildVehiclePayload = () => {
    if (!vehicleInterest.enabled) {
      return {
        vehicle_interest_provided: false,
        vehicle_interest: null,
      };
    }

    return {
      vehicle_interest_provided: true,
      vehicle_interest: {
        source_type: vehicleInterest.source_type,
        vehicle_id: sanitizeText(vehicleInterest.vehicle_id, 80) || null,
        vin: sanitizeText(vehicleInterest.vin.toUpperCase(), 17) || null,
        stock_number: sanitizeText(vehicleInterest.stock_number, 40) || null,
        year: vehicleInterest.year ? Number(vehicleInterest.year) : null,
        make: sanitizeText(vehicleInterest.make, 60) || null,
        model: sanitizeText(vehicleInterest.model, 60) || null,
        trim: sanitizeText(vehicleInterest.trim, 60) || null,
        price: vehicleInterest.price ? Number(vehicleInterest.price) : null,
        mileage: vehicleInterest.mileage ? Number(vehicleInterest.mileage) : null,
        vehicle_url: sanitizeText(vehicleInterest.vehicle_url, 300) || null,
        location_id: sanitizeText(vehicleInterest.location_id, 64) || null,
      },
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.hp.trim().length > 0) return;

    if (needsPreviousAddress) {
      if (!formData.previous_address || !formData.previous_city || !formData.previous_state || !formData.previous_zip) {
        setFormStatus('error');
        setTimeout(() => setFormStatus('idle'), 3000);
        return;
      }
    }

    if (needsPreviousEmployment) {
      if (!previousEmployment.employer_name || !previousEmployment.job_title || !previousEmployment.years_worked || !previousEmployment.months_worked) {
        setFormStatus('error');
        setTimeout(() => setFormStatus('idle'), 3000);
        return;
      }
    }

    if (!validateVehicleInterest()) {
      setFormStatus('error');
      return;
    }

    setFormStatus('loading');

    try {
      await fenderApi.submitForm({
        type: 'credit_application',
        name: `${formData.first_name} ${formData.last_name}`.trim(),
        phone: formData.phone,
        email: formData.email,
        message: `Credit application from ${formData.first_name} ${formData.last_name}`.trim(),

        hp: formData.hp,

        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        suffix: formData.suffix,
        ssn: formData.ssn,
        date_of_birth: formData.date_of_birth,
        address: formData.address,
        address_unit: formData.address_unit,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        years_at_address: parseInt(formData.years_at_address, 10) || 0,
        months_at_address: parseInt(formData.months_at_address, 10) || 0,
        previous_address: needsPreviousAddress ? formData.previous_address : undefined,
        previous_address_unit: needsPreviousAddress ? formData.previous_address_unit : undefined,
        previous_city: needsPreviousAddress ? formData.previous_city : undefined,
        previous_state: needsPreviousAddress ? formData.previous_state : undefined,
        previous_zip: needsPreviousAddress ? formData.previous_zip : undefined,
        bank_name: formData.bank_name,
        housing_status: formData.housing_status,
        monthly_housing_payment: Number(formData.monthly_housing_payment),

        income_sources: incomeSources.map((income) => ({
          pay_type: income.pay_type,
          amount: Number(income.amount),
          hours_per_week: income.pay_type === 'hourly' ? Number(income.hours_per_week) : undefined,
          job_title: income.job_title,
          employer_name: income.employer_name,
          employer_type: income.employer_type,
          tax_type: income.tax_type,
          years_at_job: parseInt(income.years_at_job, 10) || 0,
          months_at_job: parseInt(income.months_at_job, 10) || 0,
        })),

        previous_employment: needsPreviousEmployment
          ? {
              employer_name: previousEmployment.employer_name,
              job_title: previousEmployment.job_title,
              years_worked: parseInt(previousEmployment.years_worked, 10) || 0,
              months_worked: parseInt(previousEmployment.months_worked, 10) || 0,
            }
          : undefined,

        salesperson_name: formData.salesperson_name.trim() || null,
        preferred_down_payment: parseOptionalCurrency(formData.preferred_down_payment),
        submission_schema_version: 'credit_app_v2_vehicle_interest',
        ...buildVehiclePayload(),
      });

      trackLeadSubmission('credit_application', true);
      setFormStatus('success');
      setFormData({
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        ssn: '',
        date_of_birth: '',
        email: '',
        phone: '',
        address: '',
        address_unit: '',
        city: '',
        state: '',
        zip: '',
        years_at_address: '',
        months_at_address: '',
        previous_address: '',
        previous_address_unit: '',
        previous_city: '',
        previous_state: '',
        previous_zip: '',
        bank_name: '',
        housing_status: '',
        monthly_housing_payment: '',
        salesperson_name: '',
        preferred_down_payment: '',
        hp: '',
      });
      setIncomeSources([
        {
          pay_type: 'salary',
          amount: '',
          hours_per_week: '',
          job_title: '',
          employer_name: '',
          employer_type: 'company',
          tax_type: 'w2',
          years_at_job: '',
          months_at_job: '',
        },
      ]);
      setPreviousEmployment({
        employer_name: '',
        job_title: '',
        years_worked: '',
        months_worked: '',
      });
      setVehicleInterest(EMPTY_VEHICLE_INTEREST);
      setVehicleValidationError(null);
      setVehicleSearchTerm('');
    } catch (err) {
      trackLeadSubmission('credit_application', false);
      setFormStatus('error');
      console.error('Failed to submit application:', err);
      setTimeout(() => setFormStatus('idle'), 3000);
    }
  };

  if (formStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-12 border border-gray-200 shadow-sm text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
            <p className="text-gray-600 text-lg mb-8">
              Thank you for applying. Our finance team will review your application and contact you within 24 hours.
            </p>
            <a
              href="tel:7062377668"
              className="inline-flex items-center space-x-2 px-8 py-4 rounded-lg bg-red-600 text-white font-semibold shadow-lg hover:bg-red-700 transition-all duration-300"
            >
              <span>Call Us Now: 706-237-7668</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mb-12">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-red-500 to-blue-700" />
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-700 via-blue-600 to-red-600" />
          <div className="px-8 py-10 md:px-14 md:py-12">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-3 leading-tight">
              Financing Made Simple<br className="hidden md:block" />{' '}
              <span className="text-red-600">in Rome, GA</span>
            </h1>
            <p className="text-gray-500 text-base mb-8">No pressure. No surprises. Just a straightforward path to your next vehicle.</p>
            <ul className="space-y-3">
              {[
                'No hidden fees',
                'Transparent rates',
                'Real people, real support',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-gray-800 font-medium text-base">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-red-600" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* honeypot */}
            <input
              type="text"
              name="hp"
              value={formData.hp}
              onChange={(e) => setFormData({ ...formData, hp: e.target.value })}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Personal Information */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="First Name *"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <input
                  type="text"
                  placeholder="Middle Name"
                  value={formData.middle_name}
                  onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <input
                  type="text"
                  placeholder="Last Name *"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <input
                  type="text"
                  placeholder="Suffix (Jr., Sr., III, etc.)"
                  value={formData.suffix}
                  onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <input
                  type="text"
                  placeholder="Social Security Number *"
                  maxLength={11}
                  value={formData.ssn}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const formatted =
                      value.length <= 3
                        ? value
                        : value.length <= 5
                        ? `${value.slice(0, 3)}-${value.slice(3)}`
                        : `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 9)}`;
                    setFormData({ ...formData, ssn: formatted });
                  }}
                  required
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  required
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <input
                  type="tel"
                  placeholder="Phone Number *"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Current Address */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Address</h2>
              <div className="grid grid-cols-1 gap-4">
                <input
                  type="text"
                  placeholder="Street Address *"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <input
                  type="text"
                  placeholder="Unit, Apt, Suite (optional)"
                  value={formData.address_unit}
                  onChange={(e) => setFormData({ ...formData, address_unit: e.target.value })}
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="City *"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <input
                    type="text"
                    placeholder="State *"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                    className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <input
                    type="text"
                    placeholder="ZIP Code *"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    required
                    className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Years at Address *"
                    min={0}
                    value={formData.years_at_address}
                    onChange={(e) => setFormData({ ...formData, years_at_address: e.target.value })}
                    required
                    className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <input
                    type="number"
                    placeholder="Months at Address *"
                    min={0}
                    max={11}
                    value={formData.months_at_address}
                    onChange={(e) => setFormData({ ...formData, months_at_address: e.target.value })}
                    required
                    className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Previous Address */}
            {needsPreviousAddress && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Previous Address</h2>
                <p className="text-gray-600 text-sm mb-6">
                  Required since you&apos;ve been at current address less than 2 years
                </p>
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="text"
                    placeholder="Previous Street Address *"
                    value={formData.previous_address}
                    onChange={(e) => setFormData({ ...formData, previous_address: e.target.value })}
                    required
                    className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <input
                    type="text"
                    placeholder="Previous Unit, Apt, Suite (optional)"
                    value={formData.previous_address_unit}
                    onChange={(e) => setFormData({ ...formData, previous_address_unit: e.target.value })}
                    className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="City *"
                      value={formData.previous_city}
                      onChange={(e) => setFormData({ ...formData, previous_city: e.target.value })}
                      required
                      className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                    <input
                      type="text"
                      placeholder="State *"
                      value={formData.previous_state}
                      onChange={(e) => setFormData({ ...formData, previous_state: e.target.value })}
                      required
                      className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                    <input
                      type="text"
                      placeholder="ZIP Code *"
                      value={formData.previous_zip}
                      onChange={(e) => setFormData({ ...formData, previous_zip: e.target.value })}
                      required
                      className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Housing Info */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Housing Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={formData.housing_status}
                  onChange={(e) => setFormData({ ...formData, housing_status: e.target.value })}
                  required
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                >
                  <option value="" className="bg-white text-gray-900">
                    Housing Status *
                  </option>
                  <option value="Rent" className="bg-white text-gray-900">
                    Rent
                  </option>
                  <option value="Own" className="bg-white text-gray-900">
                    Own
                  </option>
                  <option value="Other" className="bg-white text-gray-900">
                    Other
                  </option>
                </select>
                <input
                  type="number"
                  placeholder="Monthly Housing Payment *"
                  value={formData.monthly_housing_payment}
                  onChange={(e) => setFormData({ ...formData, monthly_housing_payment: e.target.value })}
                  required
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Employment & Income */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Employment &amp; Income</h2>

              <input
                type="text"
                placeholder="Bank Name *"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                required
                className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 w-full mb-6"
              />

              {incomeSources.map((income, index) => (
                <div key={index} className="mb-8 p-6 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Income Source {index + 1}</h3>
                    {incomeSources.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeIncomeSource(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Job Title *"
                      value={income.job_title}
                      onChange={(e) => updateIncomeSource(index, 'job_title', e.target.value)}
                      required
                      className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                    <input
                      type="text"
                      placeholder="Employer Name *"
                      value={income.employer_name}
                      onChange={(e) => updateIncomeSource(index, 'employer_name', e.target.value)}
                      required
                      className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />

                    <select
                      value={income.employer_type}
                      onChange={(e) => updateIncomeSource(index, 'employer_type', e.target.value)}
                      required
                      className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                      <option value="company" className="bg-white text-gray-900">
                        Work for Company
                      </option>
                      <option value="self_employed" className="bg-white text-gray-900">
                        Self-Employed
                      </option>
                    </select>

                    <select
                      value={income.tax_type}
                      onChange={(e) => updateIncomeSource(index, 'tax_type', e.target.value)}
                      required
                      className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                      <option value="w2" className="bg-white text-gray-900">
                        W-2
                      </option>
                      <option value="1099" className="bg-white text-gray-900">
                        1099
                      </option>
                    </select>

                    <select
                      value={income.pay_type}
                      onChange={(e) => updateIncomeSource(index, 'pay_type', e.target.value as IncomeSource['pay_type'])}
                      required
                      className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                      <option value="salary" className="bg-white text-gray-900">
                        Salary (Monthly)
                      </option>
                      <option value="hourly" className="bg-white text-gray-900">
                        Hourly
                      </option>
                    </select>

                    {income.pay_type === 'salary' ? (
                      <input
                        type="number"
                        placeholder="Monthly Salary *"
                        value={income.amount}
                        onChange={(e) => updateIncomeSource(index, 'amount', e.target.value)}
                        required
                        className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      />
                    ) : (
                      <>
                        <input
                          type="number"
                          placeholder="Hourly Rate *"
                          step="0.01"
                          value={income.amount}
                          onChange={(e) => updateIncomeSource(index, 'amount', e.target.value)}
                          required
                          className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        />
                        <input
                          type="number"
                          placeholder="Hours per Week *"
                          value={income.hours_per_week}
                          onChange={(e) => updateIncomeSource(index, 'hours_per_week', e.target.value)}
                          required
                          className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        />
                      </>
                    )}

                    <input
                      type="number"
                      placeholder="Years at Job *"
                      min={0}
                      value={income.years_at_job}
                      onChange={(e) => updateIncomeSource(index, 'years_at_job', e.target.value)}
                      required
                      className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                    <input
                      type="number"
                      placeholder="Months at Job *"
                      min={0}
                      max={11}
                      value={income.months_at_job}
                      onChange={(e) => updateIncomeSource(index, 'months_at_job', e.target.value)}
                      required
                      className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
              ))}

              {incomeSources.length < 4 && (
                <button
                  type="button"
                  onClick={addIncomeSource}
                  className="w-full px-6 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Another Income Source</span>
                </button>
              )}
            </div>

            {/* Previous Employment */}
            {needsPreviousEmployment && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Previous Employment</h2>
                <p className="text-gray-600 text-sm mb-6">
                  Required since you&apos;ve been at current job less than 2 years
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Previous Employer Name *"
                    value={previousEmployment.employer_name}
                    onChange={(e) => setPreviousEmployment({ ...previousEmployment, employer_name: e.target.value })}
                    required
                    className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <input
                    type="text"
                    placeholder="Previous Job Title *"
                    value={previousEmployment.job_title}
                    onChange={(e) => setPreviousEmployment({ ...previousEmployment, job_title: e.target.value })}
                    required
                    className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <input
                    type="number"
                    placeholder="Years Worked *"
                    min={0}
                    value={previousEmployment.years_worked}
                    onChange={(e) => setPreviousEmployment({ ...previousEmployment, years_worked: e.target.value })}
                    required
                    className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <input
                    type="number"
                    placeholder="Months Worked *"
                    min={0}
                    max={11}
                    value={previousEmployment.months_worked}
                    onChange={(e) => setPreviousEmployment({ ...previousEmployment, months_worked: e.target.value })}
                    required
                    className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>
            )}

            {/* Vehicle of Interest (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Car className="w-6 h-6 text-blue-700" />
                  Vehicle of Interest <span className="text-sm text-gray-500 font-normal">(Optional)</span>
                </h2>
                {vehicleInterest.enabled && vehicleInterest.vehicle_id && (
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleInterest(EMPTY_VEHICLE_INTEREST);
                      setVehicleValidationError(null);
                      setVehicleSearchTerm('');
                    }}
                    className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-sm font-medium"
                  >
                    Remove vehicle
                  </button>
                )}
              </div>

              <label className="flex items-center gap-3 text-gray-600 mb-6 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={vehicleInterest.enabled}
                  onChange={(e) => {
                    setVehicleInterest((prev) => ({ ...prev, enabled: e.target.checked }));
                    if (!e.target.checked) setVehicleValidationError(null);
                  }}
                  className="w-5 h-5 rounded border-gray-300 bg-white text-red-600 focus:ring-2 focus:ring-red-500/50 cursor-pointer"
                />
                <span className="group-hover:text-gray-900 transition-colors">Add a vehicle I&apos;m interested in</span>
              </label>

              {vehicleInterest.enabled && (
                <div className="space-y-4">
                  <div ref={vehicleDropdownRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search inventory by year, make, or model..."
                        value={vehicleSearchTerm}
                        onChange={(e) => {
                          setVehicleSearchTerm(e.target.value);
                          setShowVehicleDropdown(true);
                          if (!e.target.value && vehicleInterest.vehicle_id) {
                            setVehicleInterest(EMPTY_VEHICLE_INTEREST);
                            setVehicleValidationError(null);
                          }
                        }}
                        onFocus={() => setShowVehicleDropdown(true)}
                        className="w-full pl-11 pr-10 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                      />
                      <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none transition-transform ${showVehicleDropdown ? 'rotate-180' : ''}`} />
                    </div>

                    {showVehicleDropdown && (
                      <div className="absolute z-20 mt-2 w-full max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                        {loadingInventory ? (
                          <div className="flex items-center justify-center gap-2 px-4 py-6 text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Loading inventory...</span>
                          </div>
                        ) : filteredInventory.length === 0 ? (
                          <div className="px-4 py-6 text-center text-gray-500 text-sm">
                            {vehicleSearchTerm ? 'No vehicles match your search' : 'No vehicles available'}
                          </div>
                        ) : (
                          <>
                            {filteredInventory.length > 25 && (
                              <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                                Showing 25 of {filteredInventory.length} results — type more to narrow down
                              </div>
                            )}
                            {filteredInventory.slice(0, 25).map((vehicle) => {
                              const label = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`.trim();
                              const isSelected = vehicleInterest.vehicle_id === vehicle.id;
                              return (
                                <button
                                  key={vehicle.id}
                                  type="button"
                                  onClick={() => selectInventoryVehicle(vehicle)}
                                  className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between ${
                                    isSelected
                                      ? 'bg-red-50 text-red-700'
                                      : 'text-gray-900 hover:bg-gray-50'
                                  }`}
                                >
                                  <span className="font-medium">{label}</span>
                                  {vehicle.price > 0 && (
                                    <span className="text-sm text-gray-500 ml-3 shrink-0">
                                      ${vehicle.price.toLocaleString()}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {vehicleInterest.vehicle_id && (
                    <div className="p-6 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {vehicleInterest.year} {vehicleInterest.make} {vehicleInterest.model}
                          </h3>
                          {vehicleInterest.trim && (
                            <p className="text-gray-500 text-sm">{vehicleInterest.trim}</p>
                          )}
                        </div>
                        {vehicleInterest.price && (
                          <div className="text-right">
                            <p className="text-2xl font-bold text-red-600">
                              ${Number(vehicleInterest.price).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-blue-200">
                        {vehicleInterest.stock_number && (
                          <div>
                            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Stock Number</p>
                            <p className="text-gray-900 font-medium">{vehicleInterest.stock_number}</p>
                          </div>
                        )}
                        {vehicleInterest.vin && (
                          <div>
                            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">VIN</p>
                            <p className="text-gray-900 font-mono text-sm">{vehicleInterest.vin}</p>
                          </div>
                        )}
                        {vehicleInterest.mileage && (
                          <div>
                            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Mileage</p>
                            <p className="text-gray-900 font-medium">{Number(vehicleInterest.mileage).toLocaleString()} miles</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {vehicleValidationError && (
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-red-400"></span>
                      {vehicleValidationError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Optional Deal Preferences */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Additional Preferences <span className="text-sm text-gray-400 font-normal">(Optional)</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Salesperson Name (Optional)"
                  value={formData.salesperson_name}
                  onChange={(e) => setFormData({ ...formData, salesperson_name: e.target.value })}
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Preferred Down Payment (Optional)"
                  value={formData.preferred_down_payment}
                  onChange={(e) => setFormData({ ...formData, preferred_down_payment: e.target.value })}
                  className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={formStatus === 'loading'}
                className="w-full px-8 py-4 rounded-lg bg-red-600 text-white font-semibold shadow-lg hover:bg-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formStatus === 'loading' ? 'Submitting...' : 'Submit Application'}
              </button>
              {formStatus === 'error' && (
                <p className="text-red-400 text-sm text-center mt-4">Something went wrong. Please try again.</p>
              )}
              <p className="text-gray-500 text-sm text-center mt-4">
                By submitting, you agree to our terms and authorize us to check your credit.
              </p>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">Questions? We&apos;re here to help</p>
          <a href="tel:7062377668" className="text-red-600 hover:text-red-700 text-lg font-semibold transition-colors">
            706-237-7668
          </a>
        </div>
      </div>
    </div>
  );
}
