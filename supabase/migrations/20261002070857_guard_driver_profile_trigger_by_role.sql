DROP TRIGGER IF EXISTS on_auth_user_created_driver ON auth.users;

CREATE TRIGGER on_auth_user_created_driver
AFTER INSERT ON auth.users
FOR EACH ROW
WHEN ((NEW.raw_user_meta_data ->> 'role') = 'driver')
EXECUTE FUNCTION public.handle_new_driver_profile();
