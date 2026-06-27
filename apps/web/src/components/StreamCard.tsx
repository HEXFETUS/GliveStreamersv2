import type { Stream } from '@glive/sdk';

interface Props {
  stream: Stream;
  onReady: () => void;
  onStart: () => void;
  onStop: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onPublisherConnect: () => void;
  onPublisherDisconnect: () => void;
  isPublisherConnected: boolean;
  currentTime: number;
  isBusy?: boolean;
}

export default function StreamCard({
  stream,
  onReady,
  onStart,
  onStop,
  onArchive,
  onDelete,
  onPublisherConnect,
  onPublisherDisconnect,
  isPublisherConnected,
  currentTime,
  isBusy,
}: Props) {
  const status = stream.status.toUpperCase();
  const statusColor = status === 'LIVE' ? 'text-red-400' : status === 'ENDED' ? 'text-gray-500' : 'text-yellow-400';
  const durationSeconds = stream.is_live && stream.started_at
    ? Math.max(0, Math.floor((currentTime - new Date(stream.started_at).getTime()) / 1000))
    : stream.duration_seconds;
  const duration = formatDuration(durationSeconds);
  const canReady = stream.status === 'draft';
  const canStart = stream.status === 'ready' || stream.status === 'ended';
  const canStop = stream.status === 'live';
  const canArchive = stream.status === 'ended';

  return (
    <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="font-medium text-white">{stream.title}</h3>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
          {stream.category && <span>{stream.category}</span>}
          <span>{stream.language}</span>
          <span>{stream.visibility}</span>
          {stream.tags.slice(0, 4).map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1 text-sm sm:grid-cols-4">
          <p className={`font-mono ${statusColor}`}>{status}</p>
          <p className="text-gray-400">
            Viewers <span className="text-white">{stream.viewer_count}</span>
          </p>
          <p className="text-gray-400">
            Peak <span className="text-white">{stream.peak_viewer_count}</span>
          </p>
          <p className="text-gray-400">
            Duration <span className="text-white">{duration}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {canReady && (
          <button
            onClick={onReady}
            disabled={isBusy}
            className="text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors"
          >
            Ready
          </button>
        )}
        {canStart && (
          <button
            onClick={onStart}
            disabled={isBusy}
            className="text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors"
          >
            {isBusy ? 'Starting...' : 'Start'}
          </button>
        )}
        {stream.status === 'starting' && (
          <button
            disabled
            className="text-sm bg-gray-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors"
          >
            Starting...
          </button>
        )}
        {canStop && (
          <>
            {isPublisherConnected ? (
              <button
                onClick={onPublisherDisconnect}
                disabled={isBusy}
                className="text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={onPublisherConnect}
                disabled={isBusy}
                className="text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors"
              >
                Connect
              </button>
            )}
            <button
              onClick={onStop}
              disabled={isBusy}
              className="text-sm bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors"
            >
              Stop
            </button>
          </>
        )}
        {stream.status === 'ending' && (
          <button
            disabled
            className="text-sm bg-gray-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors"
          >
            Ending...
          </button>
        )}
        {canArchive && (
          <button
            onClick={onArchive}
            disabled={isBusy}
            className="text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors"
          >
            Archive
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={isBusy}
          className="text-sm bg-red-900 hover:bg-red-800 disabled:opacity-50 text-red-200 px-3 py-1.5 rounded-md transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
