import gleam/json

pub type Model {
  Model(id: String, name: String)
}

pub type Provider {
  Provider(id: String, name: String, models: List(Model))
}

pub fn model_to_json(model: Model) -> json.Json {
  json.object([
    #("id", json.string(model.id)),
    #("name", json.string(model.name)),
  ])
}

pub fn provider_to_json(provider: Provider) -> json.Json {
  json.object([
    #("id", json.string(provider.id)),
    #("name", json.string(provider.name)),
    #("models", json.array(provider.models, of: model_to_json)),
  ])
}
