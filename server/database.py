import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "netdevice.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Kết nối cơ sở dữ liệu với tham số check_same_thread=False (để chạy an toàn trong FastAPI async)
# và timeout=30.0 để đợi ghi tránh khóa DB
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 30.0}
)

# Lắng nghe sự kiện kết nối để kích hoạt chế độ WAL & tối ưu ghi đồng thời
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
    except Exception as e:
        print(f"Không thể thiết lập PRAGMA SQLite: {e}")
    finally:
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency cung cấp Session database trong API routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
