from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

from app.filters.date_filter import DateFilter
from app.utils.utils import getTimeZone


def compare_date_today(dateFilter, date):
     date = datetime.fromisoformat(date)
     today = datetime.now(getTimeZone())

     match dateFilter:
          case DateFilter.TODAY:
               return date.date() == today.date()
          case DateFilter.YESTERDAY:
               return date.date() == (today - timedelta(days=1)).date()
          case DateFilter.THIS_WEEK:
               return date.isocalendar()[1] == today.isocalendar()[1]
          case DateFilter.THIS_MONTH:
               return date.month == today.month
          case DateFilter.THIS_YEAR:
               return date.year == today.year
          case DateFilter.LAST_WEEK:
               return date.isocalendar()[1] == (today - timedelta(weeks=1)).isocalendar()[1]
          case DateFilter.LAST_MONTH:
               return date.month == (today - relativedelta(months=1)).month
          case DateFilter.LAST_YEAR:
               return date.year == (today - relativedelta(years=1)).year
     return False

def compare_date_year_month(dateA, dateB):
     if dateB is None:
          return False
     
     dateA = datetime.fromisoformat(dateA)
     dateB = datetime.fromisoformat(dateB)

     return dateA.year == dateB.year and dateA.month == dateB.month

def compare_date_range(date, startDate, endDate):
     if startDate is None or endDate is None:
          return False
     
     date = datetime.fromisoformat(date)
     startDate = datetime.fromisoformat(startDate)
     endDate = datetime.fromisoformat(endDate)

     return startDate <= date <= endDate

     