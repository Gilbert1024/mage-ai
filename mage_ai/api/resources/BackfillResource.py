from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.backfills.service import start_backfill, cancel_backfill
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models import Backfill
from mage_ai.shared.hash import extract, merge_dict
from sqlalchemy import desc

ALLOWED_PAYLOAD_KEYS = [
    'block_uuid',
    'end_datetime',
    'interval_type',
    'interval_units',
    'name',
    'start_datetime',
]


class BackfillResource(DatabaseResource):
    datetime_keys = ['start_datetime', 'end_datetime']
    model_class = Backfill

    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        results = Backfill.query

        pipeline_uuid = query_arg.get('pipeline_uuid', [None])
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]
        if pipeline_uuid:
            results = results.filter(Backfill.pipeline_uuid == pipeline_uuid)

        return results.order_by(desc(Backfill.created_at))

    @classmethod
    def create(self, payload, user, **kwargs):
        pipeline_uuid = kwargs['parent_model'].uuid

        return super().create(merge_dict(
            extract(payload, ALLOWED_PAYLOAD_KEYS),
            dict(pipeline_uuid=pipeline_uuid),
        ), user, **kwargs)

    @safe_db_query
    def update(self, payload, **kwargs):
        pipeline_runs = []

        if 'status' in payload and payload['status'] != self.status:
            if Backfill.Status.INITIAL == payload['status']:
                pipeline_runs += start_backfill(self.model)
                return super().update(dict(status=payload['status']))
            elif Backfill.Status.CANCELLED == payload['status']:
                cancel_backfill(self.model)
                return super().update(dict(status=payload['status']))

        return super().update(extract(payload, ALLOWED_PAYLOAD_KEYS))
