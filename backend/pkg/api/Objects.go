package backend

type User struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	DateOfBirth string `json:"dateOfBirth"`
	Nickname    string `json:"nickname"`
	AboutMe     string `json:"aboutMe"`
	Age         int    `json:"-"`
	Gender      string `json:"gender"`
	Url         string `json:"url"`
	AvatarUrl   string `json:"avatarUrl"`
	CreatedAt   string `json:"createdAt"`
}

type LoginUser struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}
