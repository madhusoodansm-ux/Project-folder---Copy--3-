DO $$
DECLARE
    settings_table regclass := to_regclass('public.app_settings');
BEGIN
    IF settings_table IS NULL THEN
        RAISE EXCEPTION 'public.app_settings does not exist; refusing to create or replace it';
    END IF;

    IF EXISTS (
        SELECT required.column_name
        FROM unnest(ARRAY[
            'id',
            'service_name',
            'service_short_name',
            'support_phone',
            'support_email',
            'allow_new_bookings',
            'require_customer_details',
            'require_driver_assignment',
            'default_booking_status',
            'require_proof_of_delivery',
            'allow_delivery_updates',
            'enable_delivery_notifications',
            'booking_notifications',
            'payment_notifications',
            'driver_notifications',
            'delivery_notifications',
            'theme_mode',
            'date_format',
            'updated_by',
            'updated_at'
        ]::text[]) AS required(column_name)
        WHERE NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'app_settings'
              AND column_name = required.column_name
        )
    ) THEN
        RAISE EXCEPTION 'public.app_settings is missing columns required by the Admin Settings page';
    END IF;

    IF to_regclass('public.profiles') IS NULL
       OR NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'profiles'
              AND column_name IN ('id', 'role', 'status')
            GROUP BY table_schema, table_name
            HAVING count(*) = 3
       ) THEN
        RAISE EXCEPTION 'Expected public.profiles columns id, role, and status were not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_attribute a
          ON a.attrelid = i.indrelid
         AND a.attnum = i.indkey[0]
        WHERE i.indrelid = settings_table
          AND i.indisunique
          AND i.indpred IS NULL
          AND i.indnkeyatts = 1
          AND a.attname = 'id'
    ) THEN
        RAISE EXCEPTION 'public.app_settings.id is not uniquely constrained; refusing to change the schema';
    END IF;
END;
$$;

REVOKE ALL PRIVILEGES ON TABLE public.app_settings FROM PUBLIC, anon;
REVOKE DELETE ON TABLE public.app_settings FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.app_settings TO authenticated;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_active_admin_access
    ON public.app_settings;
DROP POLICY IF EXISTS app_settings_active_admin_guard
    ON public.app_settings;

CREATE POLICY app_settings_active_admin_access
    ON public.app_settings
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.id = auth.uid()
              AND profile.role = 'admin'
              AND profile.status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.id = auth.uid()
              AND profile.role = 'admin'
              AND profile.status = 'active'
        )
    );

CREATE POLICY app_settings_active_admin_guard
    ON public.app_settings
    AS RESTRICTIVE
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.id = auth.uid()
              AND profile.role = 'admin'
              AND profile.status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.id = auth.uid()
              AND profile.role = 'admin'
              AND profile.status = 'active'
        )
    );
