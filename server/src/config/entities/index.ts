import { DirectMessage } from "./DirectMessage";
import { Post } from "./Post";
import { Project } from "./Project";
import { Subscription } from "./Subscription";
import { Tag } from "./Tag";
import { User } from "./User";
import { MessageLike } from "./MessageLike";
import { SamplePack } from "./SamplePack";
import { SampleFolder } from "./SampleFolder";
import { AudioSample } from "./AudioSample";
import { OAuthToken } from "./OAuthToken";
import { ProjectFavorite } from "./ProjectFavorite";

const entities = [
  User,
  Post,
  Tag,
  Subscription,
  DirectMessage,
  Project,
  MessageLike,
  SamplePack,
  SampleFolder,
  AudioSample,
  OAuthToken,
  ProjectFavorite,
];

export default entities;
