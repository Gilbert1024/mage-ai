from dataclasses import dataclass
from kafka import KafkaConsumer
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sources.base import BaseSource
from enum import Enum
from typing import Callable, Dict
import json
import time

DEFAULT_BATCH_SIZE = 100


class SecurityProtocol(str, Enum):
    SASL_SSL = 'SASL_SSL'
    SSL = 'SSL'


@dataclass
class SASLConfig:
    mechanism: str = 'PLAIN'
    username: str = None
    password: str = None


@dataclass
class SSLConfig:
    cafile: str = None
    certfile: str = None
    keyfile: str = None
    password: str = None
    check_hostname: bool = False


@dataclass
class KafkaConfig(BaseConfig):
    bootstrap_server: str
    consumer_group: str
    topic: str
    batch_size: int = DEFAULT_BATCH_SIZE
    security_protocol: SecurityProtocol = None
    ssl_config: SSLConfig = None
    sasl_config: SASLConfig = None

    @classmethod
    def parse_config(self, config: Dict) -> Dict:
        ssl_config = config.get('ssl_config')
        sasl_config = config.get('sasl_config')
        if ssl_config and type(ssl_config) is dict:
            config['ssl_config'] = SSLConfig(**ssl_config)
        if sasl_config and type(sasl_config) is dict:
            config['sasl_config'] = SASLConfig(**sasl_config)
        return config


class KafkaSource(BaseSource):
    config_class = KafkaConfig

    def init_client(self):
        self._print('Start initializing consumer.')
        # Initialize kafka consumer
        consumer_kwargs = dict(
            group_id=self.config.consumer_group,
            bootstrap_servers=self.config.bootstrap_server,
            enable_auto_commit=True,
        )
        if self.config.security_protocol == SecurityProtocol.SSL:
            consumer_kwargs['security_protocol'] = SecurityProtocol.SSL
            consumer_kwargs['ssl_cafile'] = self.config.ssl_config.cafile
            consumer_kwargs['ssl_certfile'] = self.config.ssl_config.certfile
            consumer_kwargs['ssl_keyfile'] = self.config.ssl_config.keyfile
            consumer_kwargs['ssl_password'] = self.config.ssl_config.password
            consumer_kwargs['ssl_check_hostname'] = self.config.ssl_config.check_hostname
        elif self.config.security_protocol == SecurityProtocol.SASL_SSL:
            consumer_kwargs['security_protocol'] = SecurityProtocol.SASL_SSL
            consumer_kwargs['sasl_mechanism'] = self.config.sasl_config.mechanism
            consumer_kwargs['sasl_plain_username'] = self.config.sasl_config.username
            consumer_kwargs['sasl_plain_password'] = self.config.sasl_config.password

        self.consumer = KafkaConsumer(
            self.config.topic,
            **consumer_kwargs
        )
        self._print('Finish initializing consumer.')

    def read(self, handler: Callable):
        self._print('Start consuming messages.')
        for message in self.consumer:
            self.__print_message(message)
            data = json.loads(message.value.decode('utf-8'))
            handler(data)

    def batch_read(self, handler: Callable):
        self._print('Start consuming messages.')
        if self.config.batch_size > 0:
            batch_size = self.config.batch_size
        else:
            batch_size = DEFAULT_BATCH_SIZE
        while True:
            # Response format is {TopicPartiton('topic1', 1): [msg1, msg2]}
            msg_pack = self.consumer.poll(
                max_records=batch_size,
                timeout_ms=500,
            )

            message_values = []
            for tp, messages in msg_pack.items():
                for message in messages:
                    self.__print_message(message)
                    message_values.append(json.loads(message.value.decode('utf-8')))
            if len(message_values) > 0:
                handler(message_values)

    def test_connection(self):
        return True

    def __print_message(self, message):
        self._print(f'Receive message {message.partition}:{message.offset}: '
                    f'v={message.value}, time={time.time()}')
