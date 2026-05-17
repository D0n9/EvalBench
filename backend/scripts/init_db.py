import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from app.db.session import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.team import Team


def migrate_user_table():
    db = SessionLocal()
    try:
        inspector = inspect(db.bind)
        existing_columns = [col['name'] for col in inspector.get_columns('users')]

        migrations = []
        if 'username' not in existing_columns:
            migrations.append("ALTER TABLE users ADD COLUMN username VARCHAR UNIQUE")
            print("Will migrate email to username after table alteration")
        if 'is_ldap_user' not in existing_columns:
            migrations.append("ALTER TABLE users ADD COLUMN is_ldap_user BOOLEAN DEFAULT FALSE")
        if 'ldap_dn' not in existing_columns:
            migrations.append("ALTER TABLE users ADD COLUMN ldap_dn VARCHAR")
        if 'nickname' not in existing_columns:
            migrations.append("ALTER TABLE users ADD COLUMN nickname VARCHAR")
        if 'mobile' not in existing_columns:
            migrations.append("ALTER TABLE users ADD COLUMN mobile VARCHAR")
        if 'role' not in existing_columns:
            migrations.append("ALTER TABLE users ADD COLUMN role INTEGER")
        if 'last_login' not in existing_columns:
            migrations.append("ALTER TABLE users ADD COLUMN last_login TIMESTAMP")
        if 'created_at' not in existing_columns:
            migrations.append("ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
        if 'updated_at' not in existing_columns:
            migrations.append("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE")

        for migration in migrations:
            print(f"Executing migration: {migration}")
            db.execute(text(migration))

        try:
            db.execute(text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL"))
            print("Altered hashed_password to allow NULL for LDAP users")
        except Exception:
            pass

        # NEW: Set id = username for existing users
        try:
            result = db.execute(text("SELECT id, username FROM users WHERE id IS NULL OR id != username"))
            users_to_update = result.fetchall()
            for user in users_to_update:
                print(f"Setting id = username for user: {user.username}")
                db.execute(
                    text("UPDATE users SET id = username WHERE username = :username"),
                    {"username": user.username}
                )
            if users_to_update:
                db.commit()
                print(f"Updated {len(users_to_update)} users to use username as id")
        except Exception as e:
            print(f"Error updating user ids: {e}")
            db.rollback()
            raise

        # NEW: Set role = 999 for superusers, role = 2 for other users without role
        try:
            result = db.execute(text("UPDATE users SET role = 999 WHERE is_superuser = TRUE AND (role IS NULL OR role != 999)"))
            if result.rowcount > 0:
                db.commit()
                print(f"Set SUPER_ADMIN role (999) for {result.rowcount} superusers")
        except Exception as e:
            print(f"Error setting superuser roles: {e}")
            db.rollback()
            raise
        
        try:
            result = db.execute(text("UPDATE users SET role = 2 WHERE role IS NULL"))
            if result.rowcount > 0:
                db.commit()
                print(f"Set default role (MEMBER=2) for {result.rowcount} users without role")
        except Exception as e:
            print(f"Error setting default roles: {e}")
            db.rollback()
            raise

        if migrations:
            db.commit()
            print("Migration completed successfully!")

    except Exception as e:
        print(f"Migration error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def migrate_team_table():
    db = SessionLocal()
    try:
        inspector = inspect(db.bind)
        existing_columns = [col['name'] for col in inspector.get_columns('teams')]

        migrations = []
        if 'created_at' not in existing_columns:
            migrations.append("ALTER TABLE teams ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
        if 'updated_at' not in existing_columns:
            migrations.append("ALTER TABLE teams ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE")

        for migration in migrations:
            print(f"Executing migration: {migration}")
            db.execute(text(migration))

        if migrations:
            db.commit()
            print("Teams migration completed successfully!")

    except Exception as e:
        print(f"Teams migration error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def migrate_creator_foreign_keys():
    """Update creator_id columns to reference users.username instead of users.id"""
    db = SessionLocal()
    try:
        # Update tasks.creator_id
        try:
            db.execute(text("ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_creator_id_fkey"))
            db.execute(text("ALTER TABLE tasks ADD CONSTRAINT tasks_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES users(username)"))
            print("Updated tasks.creator_id foreign key")
        except Exception as e:
            print(f"Error updating tasks.creator_id: {e}")

        # Update model_configs.creator_id
        try:
            db.execute(text("ALTER TABLE model_configs DROP CONSTRAINT IF EXISTS model_configs_creator_id_fkey"))
            db.execute(text("ALTER TABLE model_configs ADD CONSTRAINT model_configs_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES users(username)"))
            print("Updated model_configs.creator_id foreign key")
        except Exception as e:
            print(f"Error updating model_configs.creator_id: {e}")

        # Update datasets.creator_id
        try:
            db.execute(text("ALTER TABLE datasets DROP CONSTRAINT IF EXISTS datasets_creator_id_fkey"))
            db.execute(text("ALTER TABLE datasets ADD CONSTRAINT datasets_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES users(username)"))
            print("Updated datasets.creator_id foreign key")
        except Exception as e:
            print(f"Error updating datasets.creator_id: {e}")

        db.commit()
        print("Creator foreign keys migration completed!")

    except Exception as e:
        print(f"Creator foreign keys migration error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def migrate_tasks_table():
    db = SessionLocal()
    try:
        inspector = inspect(db.bind)
        existing_columns = [col['name'] for col in inspector.get_columns('tasks')]

        migrations = []
        if 'celery_task_id' not in existing_columns:
            migrations.append("ALTER TABLE tasks ADD COLUMN celery_task_id VARCHAR")
            print("Will add celery_task_id column to tasks table")

        for migration in migrations:
            print(f"Executing migration: {migration}")
            db.execute(text(migration))

        if migrations:
            db.commit()
            print("Tasks migration completed successfully!")

    except Exception as e:
        print(f"Tasks migration error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def migrate_model_configs_table():
    db = SessionLocal()
    try:
        inspector = inspect(db.bind)
        if 'model_configs' not in inspector.get_table_names():
            print("model_configs table does not exist yet, skipping migration")
            return

        existing_columns = [col['name'] for col in inspector.get_columns('model_configs')]

        migrations = []
        if 'api_protocol' not in existing_columns:
            migrations.append("ALTER TABLE model_configs ADD COLUMN api_protocol VARCHAR NOT NULL DEFAULT 'openai'")
            print("Will add api_protocol column to model_configs table")
        if 'custom_api_config' not in existing_columns:
            migrations.append("ALTER TABLE model_configs ADD COLUMN custom_api_config JSON")
            print("Will add custom_api_config column to model_configs table")

        for migration in migrations:
            print(f"Executing migration: {migration}")
            db.execute(text(migration))

        if migrations:
            db.commit()
            print("Model configs migration completed successfully!")

    except Exception as e:
        print(f"Model configs migration error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def migrate_results_drop_share_columns():
    """Remove legacy share columns from results (sharing feature removed from app)."""
    db = SessionLocal()
    try:
        inspector = inspect(db.bind)
        if "results" not in inspector.get_table_names():
            print("results table does not exist yet, skipping results share-column migration")
            return

        existing_columns = {col["name"] for col in inspector.get_columns("results")}
        to_drop = [c for c in ("share_token", "is_shared") if c in existing_columns]
        if not to_drop:
            print("results table has no legacy share columns, skipping")
            return

        # Drop share_token first (may own a unique index); PostgreSQL accepts multiple DROP COLUMN.
        drops = ", ".join(f"DROP COLUMN IF EXISTS {c}" for c in to_drop)
        sql = f"ALTER TABLE results {drops}"
        print(f"Executing migration: {sql}")
        db.execute(text(sql))
        db.commit()
        print("Results share-column migration completed successfully!")
    except Exception as e:
        print(f"Results share-column migration error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def migrate_sample_results_table():
    db = SessionLocal()
    try:
        inspector = inspect(db.bind)
        if 'sample_results' not in inspector.get_table_names():
            print("sample_results table does not exist yet, skipping migration")
            return

        existing_columns = [col['name'] for col in inspector.get_columns('sample_results')]

        migrations = []
        if 'retry_count' not in existing_columns:
            migrations.append("ALTER TABLE sample_results ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0")
            print("Will add retry_count column to sample_results table")

        for migration in migrations:
            print(f"Executing migration: {migration}")
            db.execute(text(migration))

        if migrations:
            db.commit()
            print("Sample results migration completed successfully!")

        # Create indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS ix_users_team_id ON users (team_id)",
            "CREATE INDEX IF NOT EXISTS ix_tasks_is_deleted ON tasks (is_deleted)",
            "CREATE INDEX IF NOT EXISTS ix_tasks_team_id ON tasks (team_id)",
            "CREATE INDEX IF NOT EXISTS ix_tasks_creator_id ON tasks (creator_id)",
            "CREATE INDEX IF NOT EXISTS ix_results_task_id ON results (task_id)",
            "CREATE INDEX IF NOT EXISTS ix_sample_results_result_id ON sample_results (result_id)"
        ]
        for index_sql in indexes:
            try:
                db.execute(text(index_sql))
                db.commit()
                print(f"Executed index creation: {index_sql}")
            except Exception as e:
                print(f"Error creating index {index_sql}: {e}")
                db.rollback()

    except Exception as e:
        print(f"Sample results migration error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def migrate_datasets_table():
    db = SessionLocal()
    try:
        inspector = inspect(db.bind)
        if 'datasets' not in inspector.get_table_names():
            print("datasets table does not exist yet, skipping migration")
            return

        existing_columns = [col['name'] for col in inspector.get_columns('datasets')]

        migrations = []
        if 'subsets' not in existing_columns:
            migrations.append("ALTER TABLE datasets ADD COLUMN subsets JSON")
            print("Will add subsets column to datasets table")

        for migration in migrations:
            print(f"Executing migration: {migration}")
            db.execute(text(migration))

        if migrations:
            db.commit()
            print("Datasets migration completed successfully!")

    except Exception as e:
        print(f"Datasets migration error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def create_initial_data():
    db = SessionLocal()

    try:
        migrate_user_table()
        migrate_team_table()
        migrate_creator_foreign_keys()
        migrate_tasks_table()
        migrate_model_configs_table()
        migrate_results_drop_share_columns()
        migrate_sample_results_table()
        migrate_datasets_table()

        # 1. Create Default Admin Team if not exists
        admin_team = db.query(Team).filter(Team.name == "Admin Team").first()
        if not admin_team:
            print("Creating Admin Team...")
            admin_team = Team(
                id="admin-team",
                name="Admin Team",
                description="System administrators team"
            )
            db.add(admin_team)
            db.commit()
            db.refresh(admin_team)

        # 2. Ensure admin user exists and has superuser status
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if existing_admin:
            print("Admin user already exists, ensuring superuser status and team assignment...")
            existing_admin.id = "admin"  # Ensure id = username
            existing_admin.is_superuser = True
            if not existing_admin.team_id:
                existing_admin.team_id = admin_team.id
            db.commit()
        else:
            print("Creating Admin User...")
            admin_user = User(
                id="admin",
                username="admin",
                email="admin@example.com",
                hashed_password=get_password_hash("admin123"),
                full_name="Administrator",
                is_active=True,
                is_superuser=True,
                team_id=admin_team.id
            )
            db.add(admin_user)
            db.commit()
        
        print("Initial data verification completed!")
        print("Admin user: admin")
        print("Password: admin123")
        
    except Exception as e:
        print(f"Error creating initial data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_initial_data()
