-- Create premium_payments table to track premium payments
CREATE TABLE public.premium_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.insurance_policies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_month INTEGER NOT NULL, -- 1-12
  payment_year INTEGER NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premium_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own payments"
ON public.premium_payments
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own payments
CREATE POLICY "Users can insert their own payments"
ON public.premium_payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.premium_payments
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage all payments
CREATE POLICY "Admins can manage all payments"
ON public.premium_payments
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Agents can view their clients' payments
CREATE POLICY "Agents can view their clients payments"
ON public.premium_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM agent_clients ac
    JOIN agents a ON a.id = ac.agent_id
    WHERE ac.client_id = premium_payments.user_id
      AND a.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_premium_payments_policy_id ON public.premium_payments(policy_id);
CREATE INDEX idx_premium_payments_user_id ON public.premium_payments(user_id);
CREATE INDEX idx_premium_payments_month_year ON public.premium_payments(payment_year, payment_month);