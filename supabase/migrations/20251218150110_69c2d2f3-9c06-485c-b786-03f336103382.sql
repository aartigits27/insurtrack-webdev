-- Add 'inactive' and 'matured' to policy_status enum
ALTER TYPE policy_status ADD VALUE IF NOT EXISTS 'inactive';
ALTER TYPE policy_status ADD VALUE IF NOT EXISTS 'matured';