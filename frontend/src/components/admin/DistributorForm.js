// components/admin/DistributorForm.js - Updated with improved UI to match application style
import React, { useState, useEffect } from 'react';
import {
    X, Save, Plus, Trash2, User, Building2, MapPin, Phone,
    Mail, Hash, FileText, Users, Loader, AlertCircle, CheckCircle,
    Clock, Check, XCircle, ChevronDown, ChevronUp, Edit
} from 'lucide-react';
import { distributorService } from '../../services/distributorService';
import api from '../../services/api';

const DistributorForm = ({ distributor = null, onClose, onSubmit, title }) => {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [availableStaff, setAvailableStaff] = useState([]);
    const [operationStatus, setOperationStatus] = useState({
        distributor: 'pending',
        contacts: 'pending', 
        staff: 'pending'
    });
    
    // Accordion states
    const [expandedAccordion, setExpandedAccordion] = useState(null);
    
    // Form data - only basic distributor fields
    const [formData, setFormData] = useState({
        distributor_name: distributor?.distributor_name || '',
        address: distributor?.address || '',
        city: distributor?.city || '',
        ntn_number: distributor?.ntn_number || '',
        primary_contact_person: distributor?.primary_contact_person || '',
        primary_whatsapp_number: distributor?.primary_whatsapp_number || '',
        is_active: distributor?.is_active !== false
    });

    // Additional contacts management
    const [contacts, setContacts] = useState(
        distributor?.contacts || []
    );

    // Original contacts for comparison (to detect changes)
    const [originalContacts, setOriginalContacts] = useState(
        distributor?.contacts || []
    );

    // Staff assignments - handle both existing and new format
    const [assignedStaff, setAssignedStaff] = useState(() => {
        if (!distributor?.assigned_staff) return [];
        return distributor.assigned_staff.map(staff => {
            // Handle different response formats
            return staff.sales_staff_id || staff.user_id || staff.id || staff;
        }).filter(Boolean);
    });

    // Original staff for comparison
    const [originalStaff, setOriginalStaff] = useState(() => {
        if (!distributor?.assigned_staff) return [];
        return distributor.assigned_staff.map(staff => {
            return staff.sales_staff_id || staff.user_id || staff.id || staff;
        }).filter(Boolean);
    });

    useEffect(() => {
        loadAvailableStaff();
        if (distributor) {
            loadExistingData();
        }
    }, [distributor]);

    const loadAvailableStaff = async () => {
        try {
            const response = await api.get('/users?role=sales_staff&is_active=true&limit=100');
            console.log('Available staff response:', response.data);
            setAvailableStaff(response.data.data?.users || response.data?.users || []);
        } catch (error) {
            console.error('Error loading staff:', error);
        }
    };

    const loadExistingData = async () => {
        if (!distributor?.distributor_id) return;
        
        try {
            // Load existing contacts
            const contactsRes = await distributorService.getDistributorContacts(distributor.distributor_id);
            if (contactsRes?.success && contactsRes.data) {
                setContacts(contactsRes.data);
                setOriginalContacts(contactsRes.data);
            }

            // Load existing staff assignments
            const staffRes = await distributorService.getDistributorStaff(distributor.distributor_id);
            if (staffRes?.success && staffRes.data) {
                const staffIds = staffRes.data.map(staff => staff.user_id || staff.sales_staff_id);
                setAssignedStaff(staffIds);
                setOriginalStaff(staffIds);
            }
        } catch (error) {
            console.error('Error loading existing data:', error);
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

    const toggleAccordion = (accordionName) => {
        setExpandedAccordion(prev => prev === accordionName ? null : accordionName);
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.distributor_name || formData.distributor_name.trim().length === 0) {
            errors.distributor_name = 'Distributor name is required';
        }

        if (!formData.primary_contact_person || formData.primary_contact_person.trim().length === 0) {
            errors.primary_contact_person = 'Primary contact person is required';
        }

        if (!formData.primary_whatsapp_number || formData.primary_whatsapp_number.trim().length === 0) {
            errors.primary_whatsapp_number = 'WhatsApp number is required';
        }

        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Helper functions to detect changes
    const getContactChanges = () => {
        const changes = {
            toAdd: [],
            toUpdate: [],
            toDelete: []
        };

        // Find contacts to add (no contact_id)
        contacts.forEach(contact => {
            if (contact.contact_person_name.trim()) {
                if (!contact.contact_id) {
                    changes.toAdd.push(contact);
                } else {
                    changes.toUpdate.push(contact);
                }
            }
        });

        // Find contacts to delete (in original but not in current)
        originalContacts.forEach(original => {
            if (!contacts.find(c => c.contact_id === original.contact_id)) {
                changes.toDelete.push(original);
            }
        });

        return changes;
    };

    const getStaffChanges = () => {
        const toAdd = assignedStaff.filter(id => !originalStaff.includes(id));
        const toRemove = originalStaff.filter(id => !assignedStaff.includes(id));
        
        return { toAdd, toRemove };
    };

    // Individual API operations
    const updateDistributorInfo = async () => {
        setOperationStatus(prev => ({ ...prev, distributor: 'loading' }));
        
        try {
            let createdDistributor = distributor;
            
            if (distributor) {
                // Update existing distributor - only send basic fields
                await distributorService.updateDistributor(distributor.distributor_id, formData);
            } else {
                // Create new distributor
                const result = await distributorService.createDistributor(formData);
                // Store the new distributor ID for subsequent operations
                createdDistributor = { distributor_id: result.data.distributor_id };
                // Update the distributor reference for other operations
                distributor = createdDistributor;
            }
            
            setOperationStatus(prev => ({ ...prev, distributor: 'success' }));
            return true;
        } catch (error) {
            console.error('Error updating distributor info:', error);
            setOperationStatus(prev => ({ ...prev, distributor: 'error' }));
            setErrors(prev => ({
                ...prev,
                distributor: error.response?.data?.message || 'Failed to update distributor information'
            }));
            return false;
        }
    };

    const updateContacts = async () => {
        if (!distributor?.distributor_id) return true;
        
        setOperationStatus(prev => ({ ...prev, contacts: 'loading' }));
        
        try {
            const contactChanges = getContactChanges();
            
            // Delete contacts
            for (const contact of contactChanges.toDelete) {
                await distributorService.deleteDistributorContact(
                    distributor.distributor_id, 
                    contact.contact_id
                );
            }
            
            // Add new contacts
            for (const contact of contactChanges.toAdd) {
                await distributorService.addDistributorContact(
                    distributor.distributor_id, 
                    contact
                );
            }
            
            // Update existing contacts
            for (const contact of contactChanges.toUpdate) {
                await distributorService.updateDistributorContact(
                    distributor.distributor_id,
                    contact.contact_id,
                    contact
                );
            }
            
            setOperationStatus(prev => ({ ...prev, contacts: 'success' }));
            return true;
        } catch (error) {
            console.error('Error updating contacts:', error);
            setOperationStatus(prev => ({ ...prev, contacts: 'error' }));
            setErrors(prev => ({
                ...prev,
                contacts: error.response?.data?.message || 'Failed to update contacts'
            }));
            return false;
        }
    };

    const updateStaffAssignments = async () => {
        if (!distributor?.distributor_id) return true;
        
        setOperationStatus(prev => ({ ...prev, staff: 'loading' }));
        
        try {
            const staffChanges = getStaffChanges();
            
            // Remove staff assignments
            for (const staffId of staffChanges.toRemove) {
                await api.delete(`/distributors/${distributor.distributor_id}/staff/${staffId}`);
            }
            
            // Add staff assignments
            if (staffChanges.toAdd.length > 0) {
                await api.post(`/distributors/${distributor.distributor_id}/staff`, {
                    staff_ids: staffChanges.toAdd
                });
            }
            
            setOperationStatus(prev => ({ ...prev, staff: 'success' }));
            return true;
        } catch (error) {
            console.error('Error updating staff assignments:', error);
            setOperationStatus(prev => ({ ...prev, staff: 'error' }));
            setErrors(prev => ({
                ...prev,
                staff: error.response?.data?.message || 'Failed to update staff assignments'
            }));
            return false;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setLoading(true);
        setErrors({});
        
        // Reset operation status
        setOperationStatus({
            distributor: 'pending',
            contacts: 'pending',
            staff: 'pending'
        });

        try {
            // Step 1: Update distributor information
            const distributorSuccess = await updateDistributorInfo();
            if (!distributorSuccess) {
                throw new Error('Failed to update distributor information');
            }

            // Step 2: Update contacts (only if we have a distributor ID)
            const contactsSuccess = await updateContacts();
            if (!contactsSuccess) {
                throw new Error('Failed to update contacts');
            }

            // Step 3: Update staff assignments
            const staffSuccess = await updateStaffAssignments();
            if (!staffSuccess) {
                throw new Error('Failed to update staff assignments');
            }

            // All operations successful
            setTimeout(() => {
                onClose();
                if (onSubmit) {
                    onSubmit(); // Trigger parent refresh
                }
            }, 1500);

        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <Check className="w-4 h-4 text-green-600" />;
            case 'error':
                return <XCircle className="w-4 h-4 text-red-600" />;
            case 'loading':
                return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
            default:
                return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'success':
                return 'text-green-600';
            case 'error':
                return 'text-red-600';
            case 'loading':
                return 'text-blue-600';
            default:
                return 'text-gray-400';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                        <p className="text-sm text-gray-600">
                            {distributor ? 'Update distributor information' : 'Add a new distributor to your system'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Progress Indicator (shown during loading) */}
                {loading && (
                    <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
                        <div className="flex items-center justify-between text-sm">
                            <div className={`flex items-center space-x-2 ${getStatusColor(operationStatus.distributor)}`}>
                                {getStatusIcon(operationStatus.distributor)}
                                <span>Distributor Information</span>
                            </div>
                            <div className={`flex items-center space-x-2 ${getStatusColor(operationStatus.contacts)}`}>
                                {getStatusIcon(operationStatus.contacts)}
                                <span>Contacts</span>
                            </div>
                            <div className={`flex items-center space-x-2 ${getStatusColor(operationStatus.staff)}`}>
                                {getStatusIcon(operationStatus.staff)}
                                <span>Staff Assignments</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                    <div className="p-6 space-y-6">
                        {/* Error Messages */}
                        {Object.keys(errors).length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center space-x-2 text-red-800 mb-2">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="font-medium">Please fix the following errors:</span>
                                </div>
                                <ul className="text-sm text-red-700 space-y-1">
                                    {Object.entries(errors).map(([key, message]) => (
                                        <li key={key}>• {message}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Information */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Building2 className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                                </div>

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

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Address
                                        </label>
                                        <textarea
                                            value={formData.address}
                                            onChange={(e) => handleInputChange('address', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            rows="3"
                                            placeholder="Enter complete address"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            NTN Number
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.ntn_number}
                                            onChange={(e) => handleInputChange('ntn_number', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter NTN number"
                                        />
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            checked={formData.is_active}
                                            onChange={(e) => handleInputChange('is_active', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                                            Active
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Primary Contact */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <User className="w-5 h-5 text-green-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Primary Contact</h3>
                                </div>

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
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            WhatsApp Number *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.primary_whatsapp_number}
                                            onChange={(e) => handleInputChange('primary_whatsapp_number', e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                errors.primary_whatsapp_number ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                            placeholder="Enter WhatsApp number"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Additional Contacts Accordion */}
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => toggleAccordion('contacts')}
                                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <Users className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-lg font-semibold text-gray-900">Additional Contacts</h3>
                                            <p className="text-sm text-gray-600">
                                                {contacts.length} contact{contacts.length !== 1 ? 's' : ''} added
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addContact();
                                            }}
                                            className="flex items-center space-x-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Add Contact</span>
                                        </button>
                                        {expandedAccordion === 'contacts' ? (
                                            <ChevronUp className="w-5 h-5 text-gray-500" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-500" />
                                        )}
                                    </div>
                                </button>

                                {expandedAccordion === 'contacts' && (
                                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                                        {contacts.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                                <p>No additional contacts added</p>
                                                <p className="text-sm">Click "Add Contact" to add contacts</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {contacts.map((contact, index) => (
                                                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h4 className="text-md font-medium text-gray-800">
                                                                {contact.contact_person_name || `Contact ${index + 1}`}
                                                            </h4>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeContact(index)}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Contact Person Name
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={contact.contact_person_name}
                                                                    onChange={(e) => handleContactChange(index, 'contact_person_name', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    placeholder="Enter name"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Designation
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={contact.designation}
                                                                    onChange={(e) => handleContactChange(index, 'designation', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    placeholder="Enter designation"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    WhatsApp Number
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={contact.whatsapp_number}
                                                                    onChange={(e) => handleContactChange(index, 'whatsapp_number', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    placeholder="Enter WhatsApp number"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Phone Number
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={contact.phone_number}
                                                                    onChange={(e) => handleContactChange(index, 'phone_number', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    placeholder="Enter phone number"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Email
                                                                </label>
                                                                <input
                                                                    type="email"
                                                                    value={contact.email}
                                                                    onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    placeholder="Enter email"
                                                                />
                                                            </div>

                                                            <div className="flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`primary_${index}`}
                                                                    checked={contact.is_primary}
                                                                    onChange={(e) => handleContactChange(index, 'is_primary', e.target.checked)}
                                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                />
                                                                <label htmlFor={`primary_${index}`} className="ml-2 text-sm font-medium text-gray-700">
                                                                    Primary Contact
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Staff Assignments Accordion */}
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => toggleAccordion('staff')}
                                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-orange-100 rounded-lg">
                                            <Users className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-lg font-semibold text-gray-900">Assign Sales Staff</h3>
                                            <p className="text-sm text-gray-600">
                                                {assignedStaff.length} staff member{assignedStaff.length !== 1 ? 's' : ''} assigned
                                            </p>
                                        </div>
                                    </div>
                                    {expandedAccordion === 'staff' ? (
                                        <ChevronUp className="w-5 h-5 text-gray-500" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                    )}
                                </button>

                                {expandedAccordion === 'staff' && (
                                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                                        {availableStaff.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                                <p>No sales staff available</p>
                                                <p className="text-sm">Contact admin to add sales staff members</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="mb-4">
                                                    <p className="text-sm text-gray-600">
                                                        Select staff members to assign to this distributor:
                                                    </p>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {availableStaff.map((staff) => {
                                                        const isAssigned = assignedStaff.includes(staff.user_id);
                                                        return (
                                                            <div
                                                                key={staff.user_id}
                                                                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
                                                                    isAssigned
                                                                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                                        : 'border-gray-300 hover:border-gray-400 hover:shadow-sm'
                                                                }`}
                                                                onClick={() => handleStaffToggle(staff.user_id)}
                                                            >
                                                                <div className="flex items-center space-x-3">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isAssigned}
                                                                        onChange={() => handleStaffToggle(staff.user_id)}
                                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                    <div className="flex items-center space-x-3 flex-1">
                                                                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                                                                            {staff.full_name?.charAt(0) || 'U'}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <p className="text-sm font-medium text-gray-900">
                                                                                {staff.full_name || 'Unknown Staff'}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500">
                                                                                {staff.email || 'No email'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    {isAssigned && (
                                                                        <CheckCircle className="w-5 h-5 text-blue-600" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Show currently assigned staff summary */}
                                                {assignedStaff.length > 0 && (
                                                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                        <h4 className="text-sm font-medium text-blue-900 mb-3">
                                                            Currently Assigned ({assignedStaff.length}):
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {assignedStaff.map(staffId => {
                                                                const staff = availableStaff.find(s => s.user_id === staffId);
                                                                return staff ? (
                                                                    <span
                                                                        key={staffId}
                                                                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                                    >
                                                                        {staff.full_name}
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? (
                            <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        <span>{loading ? 'Saving...' : 'Save Distributor'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DistributorForm;