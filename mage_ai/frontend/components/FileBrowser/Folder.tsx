import { useMemo, useRef, useState } from 'react';

import Circle from '@oracle/elements/Circle';
import FileType, {
  ALL_SUPPORTED_FILE_EXTENSIONS_REGEX,
  FOLDER_NAME_CHARTS,
  FOLDER_NAME_PIPELINES,
  SpecialFileEnum,
  SUPPORTED_EDITABLE_FILE_EXTENSIONS_REGEX,
} from '@interfaces/FileType';
import Text from '@oracle/elements/Text';
import { BLOCK_TYPES, BlockTypeEnum } from '@interfaces/BlockType';
import {
  ChevronDown,
  ChevronRight,
  FileFill,
  Folder as FolderIcon,
  NavGraph,
  Pipeline,
} from '@oracle/icons';
import { ContextAreaProps } from '@components/ContextMenu';
import { FileContextEnum } from './index';
import {
  ICON_SIZE,
  INDENT_WIDTH,
} from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT, WIDTH_OF_SINGLE_CHARACTER } from '@oracle/styles/units/spacing';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { get, set } from '@storage/localStorage';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import {
  getBlockFromFile,
  getBlockUUIDFromFile,
  getFullPath,
  getFullPathWithoutRootFolder,
  getNonPythonBlockFromFile,
} from './utils';
import { singularize } from '@utils/string';
import { sortByKey } from '@utils/array';

const DEFAULT_NAME = 'default_repo';

export type FolderSharedProps = {
  allowSelectingFolders?: boolean;
  disableContextMenu?: boolean;
  isFileDisabled?: (filePath: string, children: FileType[]) => boolean;
  onlyShowChildren?: boolean;
  onSelectBlockFile?: (
    blockUUID: string,
    blockType: BlockTypeEnum,
    filePath: string,
  ) => void;
  openFile: (path: string) => void;
  openPipeline?: (uuid: string) => void;
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean) => void;
  selectFile?: (path: string) => void;
  uncollapsed?: boolean;
  useRootFolder?: boolean;
};

type FolderProps = {
  containerRef: any;
  file: FileType;
  level: number;
  pipelineBlockUuids: string[];
  theme: ThemeType;
  timeout?: any;
  setCoordinates: (coordinates: {
    x: number;
    y: number;
  }) => void;
  setDraggingFile: (file: FileType) => void;
  setSelectedFile: (file: FileType) => void;
} & FolderSharedProps & ContextAreaProps;

function Folder({
  allowSelectingFolders,
  containerRef,
  disableContextMenu,
  file,
  isFileDisabled,
  level,
  onSelectBlockFile,
  onlyShowChildren,
  openFile,
  openPipeline,
  openSidekickView,
  pipelineBlockUuids,
  selectFile,
  setContextItem,
  setCoordinates,
  setDraggingFile,
  setSelectedFile,
  theme,
  timeout,
  uncollapsed,
  useRootFolder,
}: FolderProps) {
  const {
    children: childrenProp,
    disabled: disabledProp,
    name,
    parent: parentFile,
  } = file;
  if (!name) {
    file.name = DEFAULT_NAME;
  }
  const filePathToUse: string = useRootFolder
    ? getFullPath(file)
    : getFullPathWithoutRootFolder(file);

  const isPipelineFolder = parentFile?.name === FOLDER_NAME_PIPELINES;
  const children = useMemo(() =>
    (childrenProp
      ? sortByKey(childrenProp, ({
          children: arr,
        }) => arr ? 0 : 1)
      : childrenProp
    ),
    [childrenProp],
  );

  const disabled = isFileDisabled
    ? isFileDisabled(filePathToUse, children)
    : (
      disabledProp
        || name === '__init__.py'
        || !!name?.match(/^\./)
        || (!name.match(ALL_SUPPORTED_FILE_EXTENSIONS_REGEX) && !childrenProp)
    );

  const uuid = `${level}/${name}`;
  const fileUsedByPipeline = pipelineBlockUuids.includes(getBlockUUIDFromFile(file));
  const [collapsed, setCollapsed] = useState<boolean>(typeof uncollapsed === 'undefined'
    ? get(uuid, false)
    : !uncollapsed,
  );

  let IconEl = FileFill;
  if (level === 1 && name === FOLDER_NAME_PIPELINES) {
    IconEl = Pipeline;
  } else if (name === FOLDER_NAME_CHARTS) {
    IconEl = NavGraph;
  } else if (children) {
    IconEl = FolderIcon;
  }

  let color;
  if (children && BLOCK_TYPES.includes(singularize(name)) && singularize(name) !== BlockTypeEnum.CHART) {
    color = getColorsForBlockType(singularize(name), { theme }).accent;
  }

  const childrenFiles = useMemo(() => children?.map((f: FileType) => (
    <Folder
      allowSelectingFolders={allowSelectingFolders}
      containerRef={containerRef}
      disableContextMenu={disableContextMenu}
      file={{
        ...f,
        parent: file,
      }}
      isFileDisabled={isFileDisabled}
      key={`${uuid}/${f?.name || DEFAULT_NAME}`}
      level={onlyShowChildren ? level : level + 1}
      onSelectBlockFile={onSelectBlockFile}
      openFile={openFile}
      openPipeline={openPipeline}
      openSidekickView={openSidekickView}
      pipelineBlockUuids={pipelineBlockUuids}
      selectFile={selectFile}
      setContextItem={setContextItem}
      setCoordinates={setCoordinates}
      setDraggingFile={setDraggingFile}
      setSelectedFile={setSelectedFile}
      theme={theme}
      timeout={timeout}
      uncollapsed={uncollapsed}
      useRootFolder={useRootFolder}
    />
  )), [
    allowSelectingFolders,
    containerRef,
    children,
    disableContextMenu,
    file,
    isFileDisabled,
    level,
    onSelectBlockFile,
    onlyShowChildren,
    openFile,
    openPipeline,
    openSidekickView,
    pipelineBlockUuids,
    selectFile,
    setContextItem,
    theme,
    timeout,
    uncollapsed,
    useRootFolder,
    uuid,
  ]);

  return (
    <>
      {!onlyShowChildren && (
        <div
          className="row"
          onClick={(e) => {
            e.preventDefault();

            if (disabled) {
              return;
            }

            if (parentFile?.name === FOLDER_NAME_CHARTS) {
              openSidekickView?.(ViewKeyEnum.CHARTS);
              const block = getBlockFromFile(file);
              if (block) {
                onSelectBlockFile?.(
                  block.uuid,
                  block.type,
                  getFullPathWithoutRootFolder(file),
                );
              }
            }

            const nonPythonBlockFromFile = getNonPythonBlockFromFile(file);

            if (children) {
              if (allowSelectingFolders) {
                selectFile(filePathToUse);
              } else {
                  setCollapsed((collapsedPrev) => {
                    set(uuid, !collapsedPrev);

                    return !collapsedPrev;
                  });
              }
            } else if (nonPythonBlockFromFile) {
              onSelectBlockFile?.(
                nonPythonBlockFromFile.uuid,
                nonPythonBlockFromFile.type,
                getFullPathWithoutRootFolder(file),
              );
            } else if (name.match(SUPPORTED_EDITABLE_FILE_EXTENSIONS_REGEX)) {
              openFile(filePathToUse);
            } else {
              const block = getBlockFromFile(file);
              if (block) {
                onSelectBlockFile?.(
                  block.uuid,
                  block.type,
                  getFullPathWithoutRootFolder(file),
                );
              }
            }
          }}
          onContextMenu={(e) => {
            clearTimeout(timeout.current);
            const block = getBlockFromFile(file);

            if (!containerRef?.current?.contains(e.target)
              || (!block && typeof children === 'undefined')
              || disableContextMenu
            ) {
              return;
            }

            e.preventDefault();

            setCoordinates(disabled
              ? null
              : {
                x: e.pageX,
                y: e.pageY,
              },
            );
            setDraggingFile(null);
            setSelectedFile(disabled ? null : file);

            if (disabled) {
              // setContextItem({ type: FileContextEnum.DISABLED });
            } else if (isPipelineFolder) {
              // setContextItem({
              //   data: {
              //     name,
              //   },
              //   type: FileContextEnum.PIPELINE,
              // });
            } else if (children) {
              // setContextItem({ type: FileContextEnum.FOLDER });
            } else if (name.match(SUPPORTED_EDITABLE_FILE_EXTENSIONS_REGEX) || name === SpecialFileEnum.INIT_PY) {
              // setContextItem({ type: FileContextEnum.FILE });
            } else {
              // if (parentFile?.name === FOLDER_NAME_CHARTS && !fileUsedByPipeline) {
              //   setContextItem({ type: FileContextEnum.FILE });
              // } else {
              //   setContextItem({
              //     data: {
              //       block: getBlockFromFile(file),
              //     },
              //     type: FileContextEnum.BLOCK_FILE,
              //   });
              // }
            }
          }}
          onMouseDown={(e) => {
            const block = file ? getBlockFromFile(file) : null;

            if (!containerRef?.current?.contains(e.target)
              || !block
              || children?.length >= 1
              || disableContextMenu
              || disabled
              || isPipelineFolder
            ) {
              return;
            }

            e.preventDefault();

            clearTimeout(timeout.current);
            timeout.current = setTimeout(() => {
              setCoordinates({
                x: e.pageX,
                y: e.pageY,
              });
              setDraggingFile(file);
              setSelectedFile(null);
            }, 300);
          }}
          style={{
            alignItems: 'center',
            cursor: 'default',
            display: 'flex',
            minWidth: (level * INDENT_WIDTH) + (file.name.length * WIDTH_OF_SINGLE_CHARACTER) + (UNIT * 2),
            paddingBottom: UNIT / 4,
            paddingLeft: (UNIT / 4) + (INDENT_WIDTH * level),
            paddingRight: (UNIT / 4),
            paddingTop: UNIT / 4,
          }}
        >
          {children && !collapsed && <ChevronDown muted size={ICON_SIZE} />}
          {children && collapsed && <ChevronRight muted size={ICON_SIZE} />}
          {!children && <div style={{ width: ICON_SIZE }} />}

          <div
            style={{
              marginLeft: UNIT / 2,
              marginRight: UNIT / 2,
            }}
          >
            {!color && <IconEl disabled={disabled} size={ICON_SIZE} />}
            {color && (
              <Circle
                color={color}
                size={ICON_SIZE}
                square
              />
            )}
          </div>

          <Text
            color={color}
            default={!color && !disabled}
            disabled={disabled}
            monospace
            small
          >
            {name}
          </Text>
        </div>
      )}

      <div
        style={{
          display: collapsed ? 'none' : 'block',
        }}
      >
        {childrenFiles}
      </div>
    </>
  );
}

export default Folder;
