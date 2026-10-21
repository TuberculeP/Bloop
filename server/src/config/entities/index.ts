import { Project } from "./Project";
import { Subscription } from "./Subscription";
import { User } from "./User";
import { SamplePack } from "./SamplePack";
import { SampleFolder } from "./SampleFolder";
import { AudioSample } from "./AudioSample";
import { OAuthToken } from "./OAuthToken";
import { ProjectFavorite } from "./ProjectFavorite";
import { UserSample } from "./UserSample";
import { UserSampleProjectLink } from "./UserSampleProjectLink";
import { LearningArticle } from "./LearningArticle";
import { LearningArticleVote } from "./LearningArticleVote";

const entities = [
  User,
  Subscription,
  Project,
  SamplePack,
  SampleFolder,
  AudioSample,
  OAuthToken,
  ProjectFavorite,
  UserSample,
  UserSampleProjectLink,
  LearningArticle,
  LearningArticleVote,
];

export default entities;
