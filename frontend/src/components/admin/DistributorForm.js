// components/admin/DistributorForm.js
import React, { useState, useEffect } from 'react';
import {
    X, Save, Plus, Trash2, User, Building2, MapPin, Phone,
    Mail, Hash, FileText, Users, Loader, AlertCircle, CheckCircle
} from 'lucide-react';
import { distributorService } from '../../services/distributorService';
import { userService } from '../../services/userService';

const DistributorForm = ({ distributor = null, onClose, onSubmit, title }) => {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [availableStaff, setAvailableStaff] = useState([]);
    
    // Form data
    const [formData, setFormData] = useState(
        distributor || distributorService.utils.getDefaultFormData()
    );

    // Additional contacts management
    const [contacts, setContacts] = useState(
        distributor?.contacts || []
    );

    // Staff assignments
    const [assignedStaff, setAssignedStaff] = useState(
        distributor?.assigned_staff || []
    );

    useEffect(() => {
        loadAvailableStaff();
    }, []);

    const loadAvailableStaff = async () => {
        try {
            const response = await api.get('/users?role=sales_staff&is_active=true&limit=100');
            setAvailableStaff(response.data.data?.users || []);
        } catch (error) {
            console.error('Error loading staff:', error);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleContactChange = (index, field, value) => {
        setContacts(prev => {
            const newContacts = [...prev];
            newContacts[index] = {
                ...newContacts[index],
                [field]: value
            };
            return newContacts;
        });
    };

    const addContact = () => {
        setContacts(prev => [
            ...prev,
            {
                contact_person_name: '',
                whatsapp_number: '',
                phone_number: '',
                email: '',
                designation: '',
                is_primary: false
            }
        ]);
    };

    const removeContact = (index) => {
        setContacts(prev => prev.filter((_, i) => i !== index));
    };

    const handleStaffToggle = (staffId) => {
        setAssignedStaff(prev => {
            if (prev.includes(staffId)) {
                return prev.filter(id => id !== staffId);
            } else {
                return [...prev, staffId];
            }
        });
    };

    const validateForm = () => {
        const validation = distributorService.utils.validateDistributorData(formData);
        
        if (!validation.isValid) {
            const formErrors = {};
            validation.errors.forEach(error => {
                if (error.includes('name')) formErrors.distributor_name = error;
                if (error.includes('contact person')) formErrors.primary_contact_person = error;
                if (error.includes('WhatsApp')) formErrors.primary_whatsapp_number = error;
                if (error.includes('NTN')) formErrors.ntn_number = error;
            });
            setErrors(formErrors);
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        try {
            setLoading(true);
            
            const submitData = {
                ...formData,
                contacts: contacts.filter(contact => contact.contact_person_name.trim()),
                assigned_staff: assignedStaff
            };

            await onSubmit(submitData);
        } catch (error) {
            console.error('Submit error:', error);
            
            if (error.response?.data?.errors) {
                const formErrors = {};
                error.response.data.errors.forEach(err => {
                    formErrors[err.path || 'general'] = err.msg;
                });
                setErrors(formErrors);
            } else {
                setErrors({
                    general: error.response?.data?.message || 'Failed to save distributor'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-8">
                        {/* General Error */}
                        {errors.general && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                                    <span className="text-red-800">{errors.general}</span>
                                </div>
                            </div>
                        )}

                        {/* Basic Information */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <Building2 className="w-5 h-5 mr-2" />
                                Basic Information
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Distributor Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.distributor_name}
                                        onChange={(e) => handleInputChange('distributor_name', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.distributor_name ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                        placeholder="Enter distributor name"
                                    />
                                    {errors.distributor_name && (
                                        <p className="mt-1 text-sm text-red-600">{errors.distributor_name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        NTN Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.ntn_number}
                                        onChange={(e) => handleInputChange('ntn_number', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.ntn_number ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                        placeholder="Enter NTN number"
                                    />
                                    {errors.ntn_number && (
                                        <p className="mt-1 text-sm text-red-600">{errors.ntn_number}</p>
                                    )}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Address
                                    </label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter complete address"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => handleInputChange('city', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter city"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        State
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.state}
                                        onChange={(e) => handleInputChange('state', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter state"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Postal Code
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.postal_code}
                                        onChange={(e) => handleInputChange('postal_code', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter postal code"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Primary Contact */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <User className="w-5 h-5 mr-2" />
                                Primary Contact
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Contact Person *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.primary_contact_person}
                                        onChange={(e) => handleInputChange('primary_contact_person', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.primary_contact_person ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                        placeholder="Enter contact person name"
                                    />
                                    {errors.primary_contact_person && (
                                        <p className="mt-1 text-sm text-red-600">{errors.primary_contact_person}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        WhatsApp Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.primary_whatsapp_number}
                                        onChange={(e) => handleInputChange('primary_whatsapp_number', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.primary_whatsapp_number ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                        placeholder="+92 300 1234567"
                                    />
                                    {errors.primary_whatsapp_number && (
                                        <p className="mt-1 text-sm text-red-600">{errors.primary_whatsapp_number}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Additional Contacts */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                                    <Users className="w-5 h-5 mr-2" />
                                    Additional Contacts
                                </h3>
                                <button
                                    type="button"
                                    onClick={addContact}
                                    className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add Contact</span>
                                </button>
                            </div>
                            
                            {contacts.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                    <p>No additional contacts added</p>
                                    <p className="text-sm">Click "Add Contact" to add more contacts</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {contacts.map((contact, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-medium text-gray-900">Contact {index + 1}</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => removeContact(index)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={contact.contact_person_name}
                                                        onChange={(e) => handleContactChange(index, 'contact_person_name', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Job title"
                                                    />
                                                </div>

                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={contact.is_primary}
                                                        onChange={(e) => handleContactChange(index, 'is_primary', e.target.checked)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <label className="ml-2 text-sm text-gray-700">
                                                        Primary Contact
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Staff Assignment */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <Users className="w-5 h-5 mr-2" />
                                Assigned Sales Staff
                            </h3>
                            
                            {availableStaff.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                    <p>No sales staff available</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {availableStaff.map((staff) => (
                                        <div key={staff.user_id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                                            <input
                                                type="checkbox"
                                                checked={assignedStaff.includes(staff.user_id)}
                                                onChange={() => handleStaffToggle(staff.user_id)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {staff.full_name}
                                                </p>
                                                <p className="text-sm text-gray-500 truncate">
                                                    {staff.email}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            <span>{loading ? 'Saving...' : 'Save Distributor'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DistributorForm;