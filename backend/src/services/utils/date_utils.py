from datetime import datetime


def iso_datetime_to_date(iso_datetime: str) -> str:
    date_object = datetime.fromisoformat(iso_datetime)
    return date_object.strftime("%Y-%m-%d")


def iso_datetime_to_date_interval(start_datetime: str, end_datetime: str) -> str:
    start_date = iso_datetime_to_date(start_datetime)
    end_date = iso_datetime_to_date(end_datetime)
    return f"{start_date}/{end_date}"
