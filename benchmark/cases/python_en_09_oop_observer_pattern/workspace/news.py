class Subject:
    def __init__(self):
        self._observers = []

    def attach(self, observer):
        self._observers.append(observer)

    def notify(self, message):
        for observer in self._observers:
            observer.update(message)

class Observer:
    def update(self, message):
        pass

# TASK: Implement two concrete observers 'EmailNotifier' and 'SmsNotifier'
# that print the message in their own specific way (e.g. "Sending Email: ...").
# Then implement a 'NewsAgency' that inherits from Subject.
