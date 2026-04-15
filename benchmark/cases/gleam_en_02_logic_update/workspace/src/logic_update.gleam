pub type Status {
  Pending
  Active
}

pub fn to_string(status: Status) -> String {
  case status {
    Pending -> "pending"
    Active -> "active"
  }
}
