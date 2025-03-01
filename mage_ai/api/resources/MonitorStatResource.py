from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.orchestration.monitor.monitor_stats import MonitorStats


class MonitorStatResource(GenericResource):
    @classmethod
    def member(self, pk, user, **kwargs):
        query = kwargs.get('query', {})

        pipeline_uuids = query.get('pipeline_uuid', None)
        if pipeline_uuids:
            pipeline_uuid = pipeline_uuids[0]
        else:
            pipeline_uuid = None

        start_times = query.get('start_time', None)
        if start_times:
            start_time = start_times[0]
        else:
            start_time = None

        end_times = query.get('end_time', None)
        if end_times:
            end_time = end_times[0]
        else:
            end_time = None

        pipeline_schedule_ids = query.get('pipeline_schedule_id', None)
        if pipeline_schedule_ids:
            pipeline_schedule_id = pipeline_schedule_ids[0]
        else:
            pipeline_schedule_id = None

        stats = MonitorStats().get_stats(
            pk,
            pipeline_uuid=pipeline_uuid,
            start_time=start_time,
            end_time=end_time,
            pipeline_schedule_id=pipeline_schedule_id,
        )

        return self(dict(
            stats_type=pk,
            stats=stats,
        ), user, **kwargs)
