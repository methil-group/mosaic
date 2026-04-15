# Task: Observer Pattern Implementation

In `news.py`, complete the implementation of the Observer design pattern.

Requirements:
- Create `EmailNotifier` subclassing `Observer`.
- Create `SmsNotifier` subclassing `Observer`.
- Both must implement `update(message)`.
- Create `NewsAgency` subclassing `Subject`.
- Ensure that calling `news_agency.notify("Breaking News")` triggers all attached notifiers.
