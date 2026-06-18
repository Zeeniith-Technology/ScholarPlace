export interface CRMUser {
    _id: string;
    person_name: string;
    person_email: string;
    person_role: 'Superadmin' | 'CRMExec';
    role?: string; // Some JWT payloads use 'role' as the key
    person_status: string;
    last_login?: string;
}

export interface CRMCollege {
    _id: string;
    name: string;
    city: string;
    state: string;
    type: string;
    pincode?: string;
    website?: string;
    student_strength_approx?: number;
    source?: string;
    pipeline_status_id: string;
    assigned_to: string | null;
    assigned_to_name: string;
    priority: 'high' | 'medium' | 'low';
    tags?: string[];
    notes?: string;
    last_activity_at?: string;
    next_follow_up_date?: string | null;
    created_at?: string;
}

export interface CRMContact {
    _id: string;
    college_id: string;
    name: string;
    designation: string;
    email: string;
    phone: string;
    whatsapp: string;
    is_primary: boolean;
}

export interface CRMActivity {
    _id: string;
    college_id: string;
    user_id: string;
    user_name: string;
    type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'note' | 'assigned' | 'status_change';
    title: string;
    description: string;
    outcome: string;
    activity_date: string;
    next_follow_up_date?: string;
}

export interface CRMTask {
    _id: string;
    college_id: string;
    assigned_to: string;
    assigned_to_name: string;
    title: string;
    due_date: string;
    priority: 'high' | 'medium' | 'low';
    is_completed: boolean;
}

export interface CRMStatus {
    _id: string;
    name: string;
    color: string;
    order: number;
    description: string;
    is_default: boolean;
}
