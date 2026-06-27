# Database Schema

## Tables

### `users`

| Column          | Type         | Notes                    |
|-----------------|--------------|--------------------------|
| `id`            | `uuid`       | PK, auto-generated       |
| `email`         | `text`       | Unique, used for login   |
| `password_hash` | `text`       | bcrypt hash              |
| `name`          | `text`       | Display name             |
| `avatar_url`    | `text`       | Nullable                 |
| `created_at`    | `timestamptz | Auto-set                 |
| `updated_at`    | `timestamptz | Auto-updated via trigger |

### `streams`

| Column         | Type         | Notes                    |
|----------------|--------------|--------------------------|
| `id`           | `uuid`       | PK, auto-generated       |
| `title`        | `text`       | Stream title             |
| `user_id`      | `uuid`       | FK → users.id            |
| `livekit_room_name` | `text` | Unique LiveKit room name |
| `status`       | `text`       | idle, live, or ended     |
| `is_live`      | `boolean`    | Default false            |
| `viewer_count` | `integer`    | Default 0                |
| `peak_viewer_count` | `integer` | Default 0               |
| `duration_seconds` | `integer` | Default 0                |
| `started_at`   | `timestamptz | Nullable                 |
| `ended_at`     | `timestamptz | Nullable                 |
| `livekit_room_created_at` | `timestamptz | Nullable       |
| `created_at`   | `timestamptz | Auto-set                 |
| `updated_at`   | `timestamptz | Auto-updated             |
