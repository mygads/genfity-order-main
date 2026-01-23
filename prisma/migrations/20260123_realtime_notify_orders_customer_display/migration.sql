-- Real-time NOTIFY triggers for WebSocket hubs
--
-- Goal:
-- - Avoid per-connection DB polling in WS server
-- - Make updates event-driven and multi-writer safe (Next.js + Go)
--
-- Channels:
-- - orders_updates: payload = merchant_id (text)
-- - public_order_updates: payload = order_number (text)
-- - customer_display_updates: payload = merchant_id (text)

-- Orders: notify merchant order lists + public order tracking
DROP TRIGGER IF EXISTS trg_notify_orders_updates ON orders;
DROP FUNCTION IF EXISTS notify_orders_updates();

CREATE FUNCTION notify_orders_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  merchant_id_text text;
  order_number_text text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    merchant_id_text := OLD.merchant_id::text;
    order_number_text := OLD.order_number;
  ELSE
    merchant_id_text := NEW.merchant_id::text;
    order_number_text := NEW.order_number;
  END IF;

  IF merchant_id_text IS NOT NULL AND merchant_id_text <> '' THEN
    PERFORM pg_notify('orders_updates', merchant_id_text);
  END IF;

  IF order_number_text IS NOT NULL AND order_number_text <> '' THEN
    PERFORM pg_notify('public_order_updates', order_number_text);
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_notify_orders_updates
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_orders_updates();

-- Customer display: notify merchant display state changes
DROP TRIGGER IF EXISTS trg_notify_customer_display_updates ON customer_display_state;
DROP FUNCTION IF EXISTS notify_customer_display_updates();

CREATE FUNCTION notify_customer_display_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  merchant_id_text text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    merchant_id_text := OLD.merchant_id::text;
  ELSE
    merchant_id_text := NEW.merchant_id::text;
  END IF;

  IF merchant_id_text IS NOT NULL AND merchant_id_text <> '' THEN
    PERFORM pg_notify('customer_display_updates', merchant_id_text);
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_notify_customer_display_updates
AFTER INSERT OR UPDATE OR DELETE ON customer_display_state
FOR EACH ROW
EXECUTE FUNCTION notify_customer_display_updates();
