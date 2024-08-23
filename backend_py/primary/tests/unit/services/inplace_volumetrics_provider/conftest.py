from pathlib import Path

import pytest
import pyarrow.csv as pacsv


CWD = Path(__file__).resolve()


# Test data
@pytest.fixture
def inplace_raw_arrow_table():
    return pacsv.read_csv(
        CWD.parent / "inplace.csv"
    )
