

## Create `user_subscriptions` Table

A new database table will be created to track Stripe subscription data for each user.

### Table Schema

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | -- |
| stripe_customer_id | text | Yes | null |
| next_renewal_date | timestamptz | Yes | null |
| is_subscribed | boolean | No | false |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

### Security

Row Level Security (RLS) will be enabled with the following policies:
- Users can **read** their own subscription record
- Users **cannot** directly insert, update, or delete subscription records (these will be managed server-side via the stripe-webhook edge function or by admins)
- Admins/founders can read and manage all records

An `updated_at` trigger will automatically keep the timestamp current on updates.

### Technical Details

The migration SQL will:
1. Create the `user_subscriptions` table with the columns above
2. Enable RLS
3. Add RLS policies for user read access and admin full access
4. Attach the existing `update_updated_at_column` trigger for automatic `updated_at` management

