
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from datetime import datetime
from enum import IntEnum


class DateFilter(IntEnum):
    ALL = 0    
    TODAY = 1
    YESTERDAY = 2
    THIS_WEEK = 3
    THIS_MONTH = 4
    THIS_YEAR = 5
    LAST_WEEK = 6
    LAST_MONTH = 7
    LAST_YEAR = 8
    CUSTOM_FILTER = 9
    CUSTOM_DATE = 10



def compare_date_today(dateFilter, date):
     date = datetime.fromisoformat(date)
     today = datetime.now()

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
     return dateA.month == dateB.month and dateA.year == dateB.year

def compare_date_range(date, startDate, endDate):
     if startDate is None or endDate is None:
          return False
     
     date = datetime.fromisoformat(date)
     startDate = datetime.fromisoformat(startDate)
     endDate = datetime.fromisoformat(endDate)

     return startDate <= date <= endDate


def compare_date_filter(date_filter: DateFilter, date, custom_date, start_date, end_date):

     if(date_filter == DateFilter.ALL):
          return True
     if(date_filter == DateFilter.CUSTOM_DATE and custom_date is not None and not compare_date_year_month(date, custom_date)):
          return False
     if(date_filter == DateFilter.CUSTOM_FILTER and start_date is not None and end_date is not None and not compare_date_range(date, start_date,  end_date)):
          return False
     if(date_filter < 9 and not compare_date_today(date_filter, date)):
          return False

     return True

