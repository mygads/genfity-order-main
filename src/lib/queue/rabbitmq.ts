import amqp, { type Channel, type Options } from 'amqplib';

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

type RabbitGlobal = {
  rabbitmq?: {
    connection?: AmqpConnection;
    channel?: Channel;
    connecting?: Promise<Channel>;
  };
};

const globalForRabbit = globalThis as unknown as RabbitGlobal;

function resetRabbitState() {
  if (globalForRabbit.rabbitmq) {
    globalForRabbit.rabbitmq.channel = undefined;
    globalForRabbit.rabbitmq.connection = undefined;
    globalForRabbit.rabbitmq.connecting = undefined;
  }
}

export async function getRabbitChannel(): Promise<Channel | null> {
  const url = process.env.RABBITMQ_URL;
  if (!url) return null;

  if (globalForRabbit.rabbitmq?.channel) {
    return globalForRabbit.rabbitmq.channel;
  }

  if (globalForRabbit.rabbitmq?.connecting) {
    return globalForRabbit.rabbitmq.connecting;
  }

  const rabbit = (globalForRabbit.rabbitmq = globalForRabbit.rabbitmq ?? {});

  rabbit.connecting = (async () => {
    const connection: AmqpConnection = await amqp.connect(url);

    connection.on('error', (err) => {
      console.error('[RabbitMQ] connection error:', err);
      resetRabbitState();
    });

    connection.on('close', () => {
      console.warn('[RabbitMQ] connection closed');
      resetRabbitState();
    });

    const channel = await connection.createChannel();

    rabbit.connection = connection;
    rabbit.channel = channel;

    return channel;
  })();

  return rabbit.connecting;
}

export function publishJson(
  channel: Channel,
  exchange: string,
  routingKey: string,
  payload: unknown,
  options?: Options.Publish,
): boolean {
  const body = Buffer.from(JSON.stringify(payload));

  return channel.publish(exchange, routingKey, body, {
    persistent: true,
    contentType: 'application/json',
    ...options,
  });
}
